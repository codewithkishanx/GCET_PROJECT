import { Router } from "express";
import type { AppConfig } from "../../config/env";
import { authenticate } from "../../middleware/auth";
import { validate } from "../../middleware/validate";
import { usersController } from "./users.controller";
import { submissionListQuerySchema, updateProfileSchema } from "./users.validator";

export function createUsersRouter(config: AppConfig): Router {
  const router = Router();
  const auth = authenticate(config);

  router.patch("/me", auth, validate({ body: updateProfileSchema }), usersController.updateMe);
  router.get("/me", auth, usersController.me);
  router.get("/me/submissions", auth, validate({ query: submissionListQuerySchema }), usersController.mySubmissions);

  // Public routes (no authentication required).
  router.get("/:username", usersController.publicProfile);
  router.get("/:username/stats", usersController.stats);

  return router;
}
