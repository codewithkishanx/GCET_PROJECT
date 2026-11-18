import crypto from "node:crypto";
import jwt, { type JwtPayload } from "jsonwebtoken";
import type { AppConfig } from "../config/env";
import { AppError } from "./errors";

export interface AccessTokenClaims {
  sub: string;
  jti: string;
  typ: "access";
  iat: number;
  exp: number;
}

export interface RefreshTokenClaims {
  sub: string;
  jti: string;
  typ: "refresh";
  iat: number;
  exp: number;
}

export function signAccessToken(userId: string, config: AppConfig): string {
  return jwt.sign({ sub: userId, typ: "access" }, config.jwtAccessSecret, {
    algorithm: "HS256",
    expiresIn: config.accessTokenTtlMin * 60,
    jwtid: crypto.randomUUID(),
  });
}

export function signRefreshToken(
  userId: string,
  config: AppConfig,
): { token: string; jti: string; expiresAt: Date } {
  const jti = crypto.randomUUID();
  const ttlSeconds = config.refreshTokenTtlDays * 24 * 60 * 60;
  const token = jwt.sign({ sub: userId, typ: "refresh" }, config.jwtRefreshSecret, {
    algorithm: "HS256",
    expiresIn: ttlSeconds,
    jwtid: jti,
  });
  return { token, jti, expiresAt: new Date(Date.now() + ttlSeconds * 1_000) };
}

function assertClaims(payload: string | JwtPayload, expected: "access" | "refresh"): JwtPayload {
  if (typeof payload === "string" || !payload.sub || payload.typ !== expected) {
    throw AppError.unauthorized("INVALID_TOKEN", "Session is no longer valid, please sign in again");
  }
  return payload;
}

export function verifyAccessToken(token: string, config: AppConfig): AccessTokenClaims {
  const payload = assertClaims(jwt.verify(token, config.jwtAccessSecret), "access");
  return payload as AccessTokenClaims;
}

export function verifyRefreshToken(token: string, config: AppConfig): RefreshTokenClaims {
  const payload = assertClaims(jwt.verify(token, config.jwtRefreshSecret), "refresh");
  return payload as RefreshTokenClaims;
}

export function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}
