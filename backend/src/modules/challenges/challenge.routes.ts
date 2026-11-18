import { Router } from "express";
import { validate } from "../../middleware/validate";
import { challengesController } from "./challenge.controller";
import { challengeListQuerySchema } from "./challenge.validator";

export function createChallengesRouter(): Router {
  const router = Router();

  router.get("/", validate({ query: challengeListQuerySchema }), challengesController.list);
  router.get("/:slug", challengesController.detail);

  return router;
}
