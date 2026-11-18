import { Router } from "express";
import type { AppConfig } from "../../config/env";
import { authenticate, optionalAuth } from "../../middleware/auth";
import type { RateLimiters } from "../../middleware/rate-limit";
import { validate } from "../../middleware/validate";
import { paginationSchema } from "../../utils/pagination";
import { postsController } from "./post.controller";
import {
  commentCreateSchema,
  createPostSchema,
  postListQuerySchema,
  reportCreateSchema,
  updatePostSchema,
} from "./post.validator";

export function createPostsRouter(config: AppConfig, limiters: RateLimiters): Router {
  const router = Router();
  const auth = authenticate(config);

  router.get("/", validate({ query: postListQuerySchema }), postsController.list);
  router.post(
    "/",
    auth,
    limiters.community,
    validate({ body: createPostSchema }),
    postsController.create,
  );
  router.get("/:slug", optionalAuth(config), postsController.detail);
  router.patch(
    "/:postId",
    auth,
    limiters.community,
    validate({ body: updatePostSchema }),
    postsController.update,
  );
  router.delete("/:postId", auth, limiters.community, postsController.remove);

  router.post("/:postId/likes", auth, limiters.community, postsController.like);
  router.delete("/:postId/likes", auth, limiters.community, postsController.unlike);

  router.get(
    "/:postId/comments",
    validate({ query: paginationSchema }),
    postsController.listComments,
  );
  router.post(
    "/:postId/comments",
    auth,
    limiters.community,
    validate({ body: commentCreateSchema }),
    postsController.createComment,
  );

  return router;
}

export function createReportsRouter(config: AppConfig, limiters: RateLimiters): Router {
  const router = Router();
  router.post(
    "/",
    authenticate(config),
    limiters.reports,
    validate({ body: reportCreateSchema }),
    postsController.report,
  );
  return router;
}
