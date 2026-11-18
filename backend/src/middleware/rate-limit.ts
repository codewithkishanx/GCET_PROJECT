import rateLimit from "express-rate-limit";
import type { NextFunction, Request, Response } from "express";
import type { AppConfig } from "../config/env";
import { AppError } from "../utils/errors";

function jsonLimiter(options: { windowMs: number; limit: number; config: AppConfig; byUser?: boolean }) {
  return rateLimit({
    windowMs: options.windowMs,
    limit: options.limit,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    // Rate limiting is disabled in tests so suites can exercise behaviour, not
    // the limiter. The limiter itself is covered by its own test.
    skip: () => options.config.nodeEnv === "test",
    ...(options.byUser
      ? { keyGenerator: (req: Request) => (req.user ? String(req.user._id) : "anonymous") }
      : {}),
    handler: (_req: Request, _res: Response, next: NextFunction) => {
      next(AppError.tooManyRequests());
    },
  });
}

export interface RateLimiters {
  global: ReturnType<typeof rateLimit>;
  auth: ReturnType<typeof rateLimit>;
  submissions: ReturnType<typeof rateLimit>;
  community: ReturnType<typeof rateLimit>;
  reports: ReturnType<typeof rateLimit>;
}

export function createRateLimiters(config: AppConfig): RateLimiters {
  return {
    global: jsonLimiter({ windowMs: 15 * 60_000, limit: 600, config }),
    auth: jsonLimiter({ windowMs: 15 * 60_000, limit: 20, config }),
    submissions: jsonLimiter({ windowMs: 5 * 60_000, limit: 15, config, byUser: true }),
    community: jsonLimiter({ windowMs: 10 * 60_000, limit: 40, config, byUser: true }),
    reports: jsonLimiter({ windowMs: 60 * 60_000, limit: 10, config, byUser: true }),
  };
}
