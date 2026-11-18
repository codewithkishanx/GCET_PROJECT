import type { Request, Response } from "express";
import type { AppConfig } from "../../config/env";
import { validated } from "../../middleware/validate";
import { setAuthCookies, clearAuthCookies, setCsrfCookie, REFRESH_COOKIE } from "../../utils/cookies";
import { AppError } from "../../utils/errors";
import { toSelfUser, toSessionView } from "../../utils/serializers";
import {
  listSessions,
  loginUser,
  registerUser,
  revokeSession,
  rotateSession,
} from "./auth.service";
import type { LoginInput, RegisterInput } from "./auth.validator";

export function createAuthController(config: AppConfig) {
  return {
    register: async (req: Request, res: Response): Promise<void> => {
      const input = validated<RegisterInput>(req, "body");
      const { user, tokens } = await registerUser(input, req, config);
      setAuthCookies(res, tokens, config);
      const csrfToken = setCsrfCookie(res, config);
      res.status(201).json({ user: toSelfUser(user), csrfToken });
    },

    login: async (req: Request, res: Response): Promise<void> => {
      const input = validated<LoginInput>(req, "body");
      const { user, tokens } = await loginUser(input, req, config);
      setAuthCookies(res, tokens, config);
      const csrfToken = setCsrfCookie(res, config);
      res.status(200).json({ user: toSelfUser(user), csrfToken });
    },

    refresh: async (req: Request, res: Response): Promise<void> => {
      const raw = req.cookies?.[REFRESH_COOKIE];
      if (typeof raw !== "string" || !raw) {
        throw AppError.unauthorized(
          "INVALID_REFRESH_TOKEN",
          "Session is no longer valid, please sign in again",
        );
      }
      const { user, tokens } = await rotateSession(raw, req, config);
      setAuthCookies(res, tokens, config);
      const csrfToken = setCsrfCookie(res, config);
      res.status(200).json({ user: toSelfUser(user), csrfToken });
    },

    logout: async (req: Request, res: Response): Promise<void> => {
      const raw = req.cookies?.[REFRESH_COOKIE];
      if (typeof raw === "string" && raw) {
        await revokeSession(raw, config);
      }
      clearAuthCookies(res);
      res.status(204).send();
    },

    me: async (req: Request, res: Response): Promise<void> => {
      if (!req.user) throw AppError.unauthorized();
      res.status(200).json({ user: toSelfUser(req.user) });
    },

    sessions: async (req: Request, res: Response): Promise<void> => {
      if (!req.user) throw AppError.unauthorized();
      const sessions = await listSessions(String(req.user._id));
      res.status(200).json({ sessions: sessions.map(toSessionView) });
    },
  };
}
