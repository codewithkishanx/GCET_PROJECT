import type { Request, Response } from "express";
import { AppError } from "../../utils/errors";
import { paginationMeta } from "../../utils/pagination";
import { toPublicUser, toSelfUser, toSubmissionView } from "../../utils/serializers";
import { validated } from "../../middleware/validate";
import {
  findByUsername,
  listMySubmissions,
  updateProfile,
  userStats,
} from "./users.service";
import type { UpdateProfileInput } from "./users.validator";

export const usersController = {
  updateMe: async (req: Request, res: Response): Promise<void> => {
    if (!req.user) throw AppError.unauthorized();
    const input = validated<UpdateProfileInput>(req, "body");
    const user = await updateProfile(String(req.user._id), input);
    res.status(200).json({ user: toSelfUser(user) });
  },

  me: async (req: Request, res: Response): Promise<void> => {
    if (!req.user) throw AppError.unauthorized();
    res.status(200).json({ user: toSelfUser(req.user) });
  },

  publicProfile: async (req: Request, res: Response): Promise<void> => {
    const username = String(req.params.username ?? "");
    const user = await findByUsername(username);
    if (!user) throw AppError.notFound("USER_NOT_FOUND", "User not found");
    res.status(200).json({ user: toPublicUser(user) });
  },

  stats: async (req: Request, res: Response): Promise<void> => {
    const username = String(req.params.username ?? "");
    const user = await findByUsername(username);
    if (!user) throw AppError.notFound("USER_NOT_FOUND", "User not found");
    const result = await userStats(user);
    res.status(200).json({ ...result, stats: result });
  },

  mySubmissions: async (req: Request, res: Response): Promise<void> => {
    if (!req.user) throw AppError.unauthorized();
    const input = validated<{
      page: number;
      limit: number;
      challengeId?: string;
    }>(req, "query");
    const { items, total } = await listMySubmissions(String(req.user._id), input);
    const mapped = items.map((item) =>
      toSubmissionView(item as Parameters<typeof toSubmissionView>[0]),
    );
    const meta = paginationMeta(total, input);
    const nextCursor = meta.page < meta.pages ? String(meta.page + 1) : null;
    res.status(200).json({
      items: mapped,
      nextCursor,
      submissions: mapped,
      pagination: meta,
    });
  },
};
