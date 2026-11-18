import { Router } from "express";
import type { AppConfig } from "../../config/env";
import { authenticate, requireRole } from "../../middleware/auth";
import type { RateLimiters } from "../../middleware/rate-limit";
import { validate } from "../../middleware/validate";
import type { ExecutionQueue } from "../../queues/execution.queue";
import {
  adminChallengeListQuerySchema,
  createChallengeSchema,
  updateChallengeSchema,
} from "../challenges/challenge.validator";
import { createAdminController } from "./admin.controller";
import {
  adminReportListQuerySchema,
  adminUserListQuerySchema,
  auditListQuerySchema,
  commentModerationSchema,
  postModerationSchema,
  reportUpdateSchema,
  userStatusSchema,
} from "./admin.validator";

/**
 * Every route in this router is protected twice: `authenticate` verifies the
 * session and `requireRole("admin")` enforces the role against the database.
 */
export function createAdminRouter(
  config: AppConfig,
  queue: ExecutionQueue,
  limiters: RateLimiters,
): Router {
  const router = Router();
  const controller = createAdminController({ config, queue });

  router.use(authenticate(config), requireRole("admin"), limiters.community);

  router.get("/overview", controller.overview);

  router.get("/users", validate({ query: adminUserListQuerySchema }), controller.listUsers);
  router.patch(
    "/users/:userId/status",
    validate({ body: userStatusSchema }),
    controller.setUserStatus,
  );

  router.get("/challenges", validate({ query: adminChallengeListQuerySchema }), controller.listChallenges);
  router.post("/challenges", validate({ body: createChallengeSchema }), controller.createChallenge);
  router.get("/challenges/:challengeId", controller.getChallenge);
  router.patch(
    "/challenges/:challengeId",
    validate({ body: updateChallengeSchema }),
    controller.updateChallenge,
  );
  router.delete("/challenges/:challengeId", controller.archiveChallenge);

  router.get("/reports", validate({ query: adminReportListQuerySchema }), controller.listReports);
  router.patch("/reports/:reportId", validate({ body: reportUpdateSchema }), controller.updateReport);

  router.patch("/posts/:postId/status", validate({ body: postModerationSchema }), controller.moderatePost);
  router.patch(
    "/comments/:commentId/status",
    validate({ body: commentModerationSchema }),
    controller.moderateComment,
  );

  router.get("/audit-logs", validate({ query: auditListQuerySchema }), controller.auditLogs);

  return router;
}
