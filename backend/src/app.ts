import express, { type Express } from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import helmet from "helmet";
import pinoHttp from "pino-http";
import type { AppConfig } from "./config/env";
import { logger } from "./lib/logger";
import { errorHandler, notFoundHandler } from "./middleware/error-handler";
import { ensureCsrfCookie } from "./utils/cookies";
import { requestId } from "./middleware/request-id";
import { createRateLimiters } from "./middleware/rate-limit";
import type { ExecutionQueue } from "./queues/execution.queue";
import { createApiRouter } from "./routes";
import { AppError } from "./utils/errors";

export interface AppDeps {
  config: AppConfig;
  queue: ExecutionQueue;
}

export function createApp(deps: AppDeps): Express {
  const { config, queue } = deps;
  const app = express();

  app.disable("x-powered-by");
  if (config.isProd) app.set("trust proxy", 1);

  app.use(requestId);

  app.use(
    pinoHttp({
      logger,
      genReqId: (req) => (req as express.Request).id,
      autoLogging: config.nodeEnv !== "test",
      customLogLevel: (_req, res, error) => {
        if (error || res.statusCode >= 500) return "error";
        if (res.statusCode >= 400) return "warn";
        return "info";
      },
      serializers: {
        req: (req) => ({
          id: req.id,
          method: req.method,
          url: req.url,
        }),
        res: (res) => ({ statusCode: res.statusCode }),
      },
    }),
  );

  app.use(
    helmet({
      contentSecurityPolicy: false, // JSON API only; the SPA sets its own policy
      crossOriginResourcePolicy: { policy: "cross-origin" },
    }),
  );

  app.use(
    cors({
      origin(origin, callback) {
        // Same-origin and non-browser clients send no Origin header.
        if (!origin || config.clientOrigins.includes(origin)) {
          callback(null, true);
          return;
        }
        callback(AppError.forbidden("CORS_NOT_ALLOWED", "Origin is not allowed"));
      },
      credentials: true,
      methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
      allowedHeaders: ["Content-Type", "X-CSRF-Token", "X-Request-Id"],
      exposedHeaders: ["X-Request-Id"],
    }),
  );

  app.use(express.json({ limit: config.maxJsonBody }));
  app.use(cookieParser());

  // Ensures the SPA always has a CSRF cookie to echo on mutating requests.
  app.use((req, res, next) => {
    ensureCsrfCookie(req, res, config);
    next();
  });

  const limiters = createRateLimiters(config);
  app.use("/api/v1", limiters.global, createApiRouter({ config, queue, limiters }));

  app.use(notFoundHandler);
  app.use(errorHandler(logger));

  return app;
}
