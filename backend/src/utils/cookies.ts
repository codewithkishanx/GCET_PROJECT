import crypto from "node:crypto";
import type { Request, Response } from "express";
import type { AppConfig } from "../config/env";

export const ACCESS_COOKIE = "dsa_at";
export const REFRESH_COOKIE = "dsa_rt";
export const CSRF_COOKIE = "dsa_csrf";
export const CSRF_HEADER = "x-csrf-token";

const REFRESH_PATH = "/api/v1/auth";

export function setAuthCookies(
  res: Response,
  tokens: { accessToken: string; refreshToken: string },
  config: AppConfig,
): void {
  const common = {
    httpOnly: true,
    secure: config.cookieSecure,
    sameSite: "lax" as const,
  };

  res.cookie(ACCESS_COOKIE, tokens.accessToken, {
    ...common,
    path: "/",
    maxAge: config.accessTokenTtlMin * 60_000,
  });

  // The refresh cookie is only ever sent to the auth endpoints, which keeps it
  // off every ordinary API request.
  res.cookie(REFRESH_COOKIE, tokens.refreshToken, {
    ...common,
    path: REFRESH_PATH,
    maxAge: config.refreshTokenTtlDays * 24 * 60 * 60_000,
  });
}

export function clearAuthCookies(res: Response): void {
  res.clearCookie(ACCESS_COOKIE, { path: "/" });
  res.clearCookie(REFRESH_COOKIE, { path: REFRESH_PATH });
}

export function setCsrfCookie(res: Response, config: AppConfig): string {
  const token = crypto.randomBytes(32).toString("base64url");
  res.cookie(CSRF_COOKIE, token, {
    httpOnly: false,
    secure: config.cookieSecure,
    sameSite: "lax",
    path: "/",
    maxAge: config.refreshTokenTtlDays * 24 * 60 * 60_000,
  });
  return token;
}

/** Issues the double-submit cookie if the browser does not have one yet. */
export function ensureCsrfCookie(req: Request, res: Response, config: AppConfig): void {
  if (!req.cookies?.[CSRF_COOKIE]) {
    setCsrfCookie(res, config);
  }
}

export function csrfCookieValue(req: Request): string | undefined {
  const value = req.cookies?.[CSRF_COOKIE];
  return typeof value === "string" ? value : undefined;
}
