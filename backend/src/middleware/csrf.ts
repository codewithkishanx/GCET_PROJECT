import crypto from "node:crypto";
import type { NextFunction, Request, Response } from "express";
import { AppError } from "../utils/errors";
import { CSRF_COOKIE, CSRF_HEADER } from "../utils/cookies";

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

function safeEqual(left: string, right: string): boolean {
  const a = Buffer.from(left, "utf8");
  const b = Buffer.from(right, "utf8");
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

/**
 * Double-submit CSRF protection. Cookies are sent automatically by the browser,
 * so every state-changing request must also echo the non-HttpOnly CSRF cookie in
 * a header that a cross-site page cannot set.
 */
export function csrfProtection(req: Request, _res: Response, next: NextFunction): void {
  if (SAFE_METHODS.has(req.method)) {
    next();
    return;
  }

  const cookie = req.cookies?.[CSRF_COOKIE];
  const header = req.header(CSRF_HEADER);

  if (typeof cookie !== "string" || !header || !safeEqual(cookie, header)) {
    next(AppError.forbidden("CSRF_INVALID", "Missing or invalid CSRF token"));
    return;
  }

  next();
}
