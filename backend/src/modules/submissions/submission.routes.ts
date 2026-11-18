import { Router } from "express";
import type { AppConfig } from "../../config/env";
import { authenticate } from "../../middleware/auth";
import type { RateLimiters } from "../../middleware/rate-limit";
import { validate } from "../../middleware/validate";
import type { ExecutionQueue } from "../../queues/execution.queue";
import { createSubmissionController } from "./submission.controller";
import { createSubmissionSchema } from "./submission.validator";

export function createSubmissionsRouter(
  config: AppConfig,
  queue: ExecutionQueue,
  limiters: RateLimiters,
): Router {
  const router = Router();
  const controller = createSubmissionController({ config, queue });
  const auth = authenticate(config);

  router.post(
    "/challenges/:challengeId/submissions",
    auth,
    limiters.submissions,
    validate({ body: createSubmissionSchema }),
    controller.create,
  );

  router.get("/submissions/:submissionId", auth, controller.detail);

  return router;
}
