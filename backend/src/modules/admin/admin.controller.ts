import type { Request, Response } from "express";
import type { Challenge } from "@dsa/shared";
import type { AppConfig } from "../../config/env";
import type { ExecutionQueue } from "../../queues/execution.queue";
import { AppError } from "../../utils/errors";
import { validated } from "../../middleware/validate";
import { paginationMeta } from "../../utils/pagination";
import { toAdminChallenge, toAdminUser, toCommentView, toPostView } from "../../utils/serializers";
import {
  adminGetChallenge,
  adminListChallenges,
  archiveChallenge,
  createChallenge,
  updateChallenge,
} from "../challenges/challenge.service";
import type {
  AdminChallengeListInput,
  CreateChallengeInput,
  UpdateChallengeInput,
} from "../challenges/challenge.validator";
import {
  moderateCommentStatus,
  moderatePostStatus,
  authorFor,
} from "../posts/post.service";
import {
  listAuditLogs,
  listReports,
  listUsers,
  overview,
  recordChallengeAudit,
  setUserStatus,
  updateReport,
} from "./admin.service";
import type {
  AdminReportListInput,
  AdminUserListInput,
  ReportUpdateInput,
  UserStatusInput,
} from "./admin.validator";

function requireActor(req: Request) {
  if (!req.user) throw AppError.unauthorized();
  return req.user;
}

export function createAdminController(deps: { config: AppConfig; queue: ExecutionQueue }) {
  return {
    overview: async (_req: Request, res: Response): Promise<void> => {
      res.status(200).json(await overview(deps.queue));
    },

    listUsers: async (req: Request, res: Response): Promise<void> => {
      const input = validated<AdminUserListInput>(req, "query");
      const { items, total } = await listUsers(input);
      const mapped = items.map((user) => toAdminUser(user as Parameters<typeof toAdminUser>[0]));
      const meta = paginationMeta(total, input);
      const nextCursor = meta.page < meta.pages ? String(meta.page + 1) : null;
      res.status(200).json({
        items: mapped,
        nextCursor,
        users: mapped,
        pagination: meta,
      });
    },

    setUserStatus: async (req: Request, res: Response): Promise<void> => {
      const actor = requireActor(req);
      const input = validated<UserStatusInput>(req, "body");
      const user = await setUserStatus(actor, String(req.params.userId ?? ""), input, req);
      res.status(200).json({ user: toAdminUser(user) });
    },

    listReports: async (req: Request, res: Response): Promise<void> => {
      const input = validated<AdminReportListInput>(req, "query");
      const { items, total } = await listReports(input);
      const meta = paginationMeta(total, input);
      const nextCursor = meta.page < meta.pages ? String(meta.page + 1) : null;
      res.status(200).json({
        items,
        nextCursor,
        reports: items,
        pagination: meta,
      });
    },

    updateReport: async (req: Request, res: Response): Promise<void> => {
      const actor = requireActor(req);
      const input = validated<ReportUpdateInput>(req, "body");
      const report = await updateReport(actor, String(req.params.reportId ?? ""), input, req);
      res.status(200).json({ report });
    },

    listChallenges: async (req: Request, res: Response): Promise<void> => {
      const input = validated<AdminChallengeListInput>(req, "query");
      const { items, total } = await adminListChallenges(input);
      const mapped = items.map((challenge) => toAdminChallenge(challenge as Challenge));
      const meta = paginationMeta(total, input);
      const nextCursor = meta.page < meta.pages ? String(meta.page + 1) : null;
      res.status(200).json({
        items: mapped,
        nextCursor,
        challenges: mapped,
        pagination: meta,
      });
    },

    getChallenge: async (req: Request, res: Response): Promise<void> => {
      const challenge = await adminGetChallenge(String(req.params.challengeId ?? ""));
      res.status(200).json({ challenge: toAdminChallenge(challenge) });
    },

    createChallenge: async (req: Request, res: Response): Promise<void> => {
      const actor = requireActor(req);
      const input = validated<CreateChallengeInput>(req, "body");
      const challenge = await createChallenge(input, String(actor._id));
      await recordChallengeAudit(
        actor,
        "challenge.create",
        String(challenge._id),
        { slug: challenge.slug, status: challenge.status },
        req,
      );
      res.status(201).json({ challenge: toAdminChallenge(challenge) });
    },

    updateChallenge: async (req: Request, res: Response): Promise<void> => {
      const actor = requireActor(req);
      const input = validated<UpdateChallengeInput>(req, "body");
      const challenge = await updateChallenge(String(req.params.challengeId ?? ""), input);
      await recordChallengeAudit(
        actor,
        "challenge.update",
        String(challenge._id),
        { slug: challenge.slug, status: challenge.status },
        req,
      );
      res.status(200).json({ challenge: toAdminChallenge(challenge) });
    },

    archiveChallenge: async (req: Request, res: Response): Promise<void> => {
      const actor = requireActor(req);
      const challengeId = String(req.params.challengeId ?? "");
      await archiveChallenge(challengeId);
      await recordChallengeAudit(actor, "challenge.archive", challengeId, {}, req);
      res.status(204).send();
    },

    moderatePost: async (req: Request, res: Response): Promise<void> => {
      const actor = requireActor(req);
      const body = validated<{ status: "published" | "hidden" | "removed" }>(req, "body");
      const post = await moderatePostStatus(String(req.params.postId ?? ""), body.status);
      await recordChallengeAudit(
        actor,
        "post.moderate",
        String(post._id),
        { status: body.status },
        req,
      );
      res.status(200).json({ post: toPostView(post, await authorFor(post.authorId)) });
    },

    moderateComment: async (req: Request, res: Response): Promise<void> => {
      const actor = requireActor(req);
      const body = validated<{ status: "visible" | "hidden" | "removed" }>(req, "body");
      const comment = await moderateCommentStatus(
        String(req.params.commentId ?? ""),
        body.status,
      );
      await recordChallengeAudit(
        actor,
        "comment.moderate",
        String(comment._id),
        { status: body.status },
        req,
      );
      res.status(200).json({ comment: toCommentView(comment, await authorFor(comment.authorId)) });
    },

    auditLogs: async (req: Request, res: Response): Promise<void> => {
      const input = validated<{ page: number; limit: number; action?: string }>(req, "query");
      const { items, total } = await listAuditLogs(input);
      res.status(200).json({ logs: items, pagination: paginationMeta(total, input) });
    },
  };
}
