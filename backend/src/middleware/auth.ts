import type { NextFunction, Request, Response } from "express";
import { UserModel, type Role, type User } from "@dsa/shared";
import type { AppConfig } from "../config/env";
import { AppError } from "../utils/errors";
import { ACCESS_COOKIE } from "../utils/cookies";
import { verifyAccessToken } from "../utils/tokens";

async function resolveUser(token: string, config: AppConfig): Promise<User> {
  const claims = verifyAccessToken(token, config);
  const user = await UserModel.findById(claims.sub).lean<User | null>();
  if (!user) {
    throw AppError.unauthorized("INVALID_TOKEN", "Session is no longer valid, please sign in again");
  }
  if (user.status === "suspended") {
    throw AppError.forbidden(
      "ACCOUNT_SUSPENDED",
      "This account is suspended. Contact an administrator.",
    );
  }
  return user;
}

/**
 * Verifies the access token and re-reads role/status from the database, so a
 * suspension or role change takes effect immediately rather than at token expiry.
 */
export function authenticate(config: AppConfig) {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    try {
      const token = req.cookies?.[ACCESS_COOKIE];
      if (typeof token !== "string" || !token) {
        throw AppError.unauthorized();
      }
      req.user = await resolveUser(token, config);
      next();
    } catch (error) {
      next(error);
    }
  };
}

/** Attaches the user when a valid session exists, but never rejects. */
export function optionalAuth(config: AppConfig) {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    try {
      const token = req.cookies?.[ACCESS_COOKIE];
      if (typeof token === "string" && token) {
        req.user = await resolveUser(token, config);
      }
    } catch {
      req.user = undefined;
    }
    next();
  };
}

export function requireRole(...roles: Role[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      next(AppError.unauthorized());
      return;
    }
    if (!roles.includes(req.user.role)) {
      next(AppError.forbidden("FORBIDDEN", "Administrator access is required"));
      return;
    }
    next();
  };
}
