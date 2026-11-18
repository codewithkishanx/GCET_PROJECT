import { Router } from "express";
import type { AppConfig } from "../../config/env";
import { authenticate } from "../../middleware/auth";
import { csrfProtection } from "../../middleware/csrf";
import type { RateLimiters } from "../../middleware/rate-limit";
import { validate } from "../../middleware/validate";
import { createAuthController } from "./auth.controller";
import { loginSchema, registerSchema } from "./auth.validator";

export function createAuthRouter(config: AppConfig, limiters: RateLimiters): Router {
  const router = Router();
  const controller = createAuthController(config);

  // Login and register have no CSRF cookie yet; they are protected by the auth
  // rate limiter and SameSite cookies. Refresh and logout do use CSRF.
  router.post("/register", limiters.auth, validate({ body: registerSchema }), controller.register);
  router.post("/login", limiters.auth, validate({ body: loginSchema }), controller.login);
  router.post("/refresh", csrfProtection, controller.refresh);
  router.post("/logout", csrfProtection, controller.logout);
  router.get("/me", authenticate(config), controller.me);
  router.get("/sessions", authenticate(config), controller.sessions);

  return router;
}
