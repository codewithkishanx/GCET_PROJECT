import { Router } from "express";
import type { AppConfig } from "./config/env";
import type { ExecutionQueue } from "./queues/execution.queue";
import { csrfProtection } from "./middleware/csrf";
import { createRateLimiters, type RateLimiters } from "./middleware/rate-limit";
import { createAdminRouter } from "./modules/admin/admin.routes";
import { createAuthRouter } from "./modules/auth/auth.routes";
import { createChallengesRouter } from "./modules/challenges/challenge.routes";
import { createHealthRouter } from "./modules/health/health.routes";
import { createLeaderboardRouter } from "./modules/leaderboard/leaderboard.routes";
import { createPostsRouter, createReportsRouter } from "./modules/posts/post.routes";
import { createSubmissionsRouter } from "./modules/submissions/submission.routes";
import { createTopicsRouter } from "./modules/topics/topic.routes";
import { createUsersRouter } from "./modules/users/users.routes";

export interface ApiDeps {
  config: AppConfig;
  queue: ExecutionQueue;
  limiters: RateLimiters;
}

export function createApiRouter(deps: ApiDeps): Router {
  const { config, queue, limiters } = deps;
  const api = Router();

  api.use("/health", createHealthRouter(queue));

  // Auth routes handle their own CSRF on the two cookie-refreshing endpoints.
  api.use("/auth", createAuthRouter(config, limiters));

  // From here on every state-changing request requires a CSRF token.
  api.use(csrfProtection);

  api.use("/users", createUsersRouter(config));
  api.use("/topics", createTopicsRouter());
  api.use(createSubmissionsRouter(config, queue, limiters));
  api.use("/challenges", createChallengesRouter());
  api.use("/leaderboard", createLeaderboardRouter());
  api.use("/posts", createPostsRouter(config, limiters));
  api.use("/reports", createReportsRouter(config, limiters));
  api.use("/admin", createAdminRouter(config, queue, limiters));

  return api;
}

export { createRateLimiters };
