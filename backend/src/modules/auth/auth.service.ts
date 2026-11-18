import crypto from "node:crypto";
import type { Request } from "express";
import {
  RefreshTokenModel,
  UserModel,
  isDuplicateKeyError,
  type User,
} from "@dsa/shared";
import type { AppConfig } from "../../config/env";
import { AppError } from "../../utils/errors";
import { normalizeEmail, normalizeUsername } from "../../utils/normalize";
import { hashPassword, verifyPassword } from "../../utils/password";
import {
  hashToken,
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} from "../../utils/tokens";
import type { LoginInput, RegisterInput } from "./auth.validator";

interface SessionTokens {
  accessToken: string;
  refreshToken: string;
}

function requestMeta(req: Request): { userAgent: string | null; ip: string | null } {
  return {
    userAgent: req.get("user-agent")?.slice(0, 300) ?? null,
    ip: req.ip?.slice(0, 64) ?? null,
  };
}

async function persistRefreshToken(
  userId: string,
  refresh: { token: string; jti: string; expiresAt: Date },
  req: Request,
): Promise<void> {
  const meta = requestMeta(req);
  await RefreshTokenModel.create({
    userId,
    jti: refresh.jti,
    tokenHash: hashToken(refresh.token),
    expiresAt: refresh.expiresAt,
    userAgent: meta.userAgent,
    ip: meta.ip,
  });
}

async function issueTokens(user: User, req: Request, config: AppConfig): Promise<SessionTokens> {
  const userId = String(user._id);
  const accessToken = signAccessToken(userId, config);
  const refresh = signRefreshToken(userId, config);
  await persistRefreshToken(userId, refresh, req);
  return { accessToken, refreshToken: refresh.token };
}

export async function registerUser(
  input: RegisterInput,
  req: Request,
  config: AppConfig,
): Promise<{ user: User; tokens: SessionTokens }> {
  const username = normalizeUsername(input.username);
  const email = normalizeEmail(input.email);
  const passwordHash = await hashPassword(input.password);

  let user: User;
  try {
    user = await UserModel.create({ username, email, passwordHash });
  } catch (error) {
    if (isDuplicateKeyError(error)) {
      const field = Object.keys(
        (error as { keyPattern?: Record<string, unknown> }).keyPattern ?? {},
      )[0];
      throw AppError.conflict(
        "ACCOUNT_EXISTS",
        field === "email"
          ? "An account with this email already exists"
          : "This username is already taken",
      );
    }
    throw error;
  }

  const tokens = await issueTokens(user, req, config);
  return { user, tokens };
}

export async function loginUser(
  input: LoginInput,
  req: Request,
  config: AppConfig,
): Promise<{ user: User; tokens: SessionTokens }> {
  const identifier = input.usernameOrEmail.trim().toLowerCase();
  const user = await UserModel.findOne({
    $or: [{ username: identifier }, { email: identifier }],
  }).select("+passwordHash");

  // One generic failure for unknown account and wrong password, so the endpoint
  // cannot be used to enumerate accounts.
  const invalid = AppError.unauthorized("INVALID_CREDENTIALS", "Invalid username/email or password");
  if (!user || !user.passwordHash) throw invalid;

  const matches = await verifyPassword(user.passwordHash, input.password);
  if (!matches) throw invalid;

  if (user.status === "suspended") {
    throw AppError.forbidden(
      "ACCOUNT_SUSPENDED",
      "This account is suspended. Contact an administrator.",
    );
  }

  const safeUser = await UserModel.findById(user._id).lean<User | null>();
  if (!safeUser) throw invalid;

  const tokens = await issueTokens(safeUser, req, config);
  return { user: safeUser, tokens };
}

async function revokeAllSessions(userId: string): Promise<void> {
  await RefreshTokenModel.updateMany(
    { userId, revokedAt: null },
    { $set: { revokedAt: new Date() } },
  );
}

export async function rotateSession(
  rawToken: string,
  req: Request,
  config: AppConfig,
): Promise<{ user: User; tokens: SessionTokens }> {
  const claims = verifyRefreshToken(rawToken, config);
  const existing = await RefreshTokenModel.findOne({
    jti: claims.jti,
    userId: claims.sub,
  }).select("+tokenHash");

  const invalid = AppError.unauthorized(
    "INVALID_REFRESH_TOKEN",
    "Session is no longer valid, please sign in again",
  );
  if (!existing) throw invalid;

  // Reuse of an already-rotated token means the token was stolen or replayed.
  if (existing.revokedAt) {
    await revokeAllSessions(claims.sub);
    throw invalid;
  }

  if (existing.expiresAt.getTime() <= Date.now()) throw invalid;

  const presentedHash = Buffer.from(hashToken(rawToken), "utf8");
  const storedHash = Buffer.from(existing.tokenHash ?? "", "utf8");
  if (
    storedHash.length !== presentedHash.length ||
    !crypto.timingSafeEqual(storedHash, presentedHash)
  ) {
    await revokeAllSessions(claims.sub);
    throw invalid;
  }

  const user = await UserModel.findById(claims.sub).lean<User | null>();
  if (!user) throw invalid;
  if (user.status === "suspended") {
    await revokeAllSessions(claims.sub);
    throw AppError.forbidden("ACCOUNT_SUSPENDED", "This account is suspended.");
  }

  const next = signRefreshToken(claims.sub, config);
  existing.revokedAt = new Date();
  existing.replacedByJti = next.jti;
  await existing.save();
  await persistRefreshToken(claims.sub, next, req);

  return {
    user,
    tokens: {
      accessToken: signAccessToken(claims.sub, config),
      refreshToken: next.token,
    },
  };
}

export async function revokeSession(rawToken: string, config: AppConfig): Promise<void> {
  try {
    const claims = verifyRefreshToken(rawToken, config);
    await RefreshTokenModel.updateOne(
      { jti: claims.jti, revokedAt: null },
      { $set: { revokedAt: new Date() } },
    );
  } catch {
    // Logout is idempotent: an expired or malformed cookie is simply cleared.
  }
}

export async function listSessions(userId: string) {
  return RefreshTokenModel.find({ userId, revokedAt: null, expiresAt: { $gt: new Date() } })
    .sort({ createdAt: -1 })
    .limit(20)
    .lean();
}
