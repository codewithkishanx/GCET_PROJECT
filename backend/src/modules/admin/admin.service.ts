import {
  AuditLogModel,
  ChallengeModel,
  PostModel,
  RefreshTokenModel,
  ReportModel,
  SubmissionModel,
  UserModel,
  WorkerHeartbeatModel,
  type User,
} from "@dsa/shared";
import type { Request } from "express";
import type { ExecutionQueue } from "../../queues/execution.queue";
import { AppError } from "../../utils/errors";
import { recordAudit } from "../../utils/audit";
import { escapeRegex, toSkipLimit } from "../../utils/pagination";
import type {
  AdminReportListInput,
  AdminUserListInput,
  ReportUpdateInput,
  UserStatusInput,
} from "./admin.validator";

export async function overview(queue: ExecutionQueue) {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1_000);

  const [users, challenges, submissions, posts, openReports, verdicts, recentSubmissions, heartbeat, queueCounts] =
    await Promise.all([
      UserModel.countDocuments(),
      ChallengeModel.countDocuments(),
      SubmissionModel.countDocuments(),
      PostModel.countDocuments(),
      ReportModel.countDocuments({ status: "open" }),
      SubmissionModel.aggregate<{ _id: string | null; count: number }>([
        { $match: { createdAt: { $gte: since } } },
        { $group: { _id: "$verdict", count: { $sum: 1 } } },
      ]),
      SubmissionModel.find()
        .sort({ createdAt: -1 })
        .limit(10)
        .select("userId challengeId language status verdict createdAt")
        .lean(),
      WorkerHeartbeatModel.findOne({ key: "worker" }).lean(),
      queue.counts(),
    ]);

  const verdictBreakdown: Record<string, number> = {};
  for (const row of verdicts) {
    verdictBreakdown[row._id ?? "IN_PROGRESS"] = row.count;
  }

  return {
    counts: { users, challenges, submissions, posts, openReports },
    verdictBreakdown24h: verdictBreakdown,
    recentSubmissions,
    execution: {
      queue: queueCounts,
      worker: heartbeat
        ? {
            lastSeenAt: heartbeat.lastSeenAt,
            concurrency: heartbeat.concurrency,
            version: heartbeat.version,
            online: Date.now() - new Date(heartbeat.lastSeenAt).getTime() < 60_000,
          }
        : null,
    },
  };
}

export async function listUsers(input: AdminUserListInput) {
  const filter: Record<string, unknown> = {};
  if (input.status) filter.status = input.status;
  if (input.q) {
    const pattern = new RegExp(escapeRegex(input.q), "i");
    filter.$or = [{ username: pattern }, { email: pattern }, { displayName: pattern }];
  }

  const { skip, limit } = toSkipLimit(input);
  const [items, total] = await Promise.all([
    UserModel.find(filter)
      .select("username email role status points solvedCount displayName createdAt updatedAt")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    UserModel.countDocuments(filter),
  ]);
  return { items, total };
}

export async function setUserStatus(
  actor: User,
  targetId: string,
  input: UserStatusInput,
  req: Request,
): Promise<User> {
  if (String(actor._id) === targetId && input.status === "suspended") {
    throw AppError.badRequest("SELF_SUSPEND", "You cannot suspend your own account");
  }

  const target = await UserModel.findById(targetId);
  if (!target) throw AppError.notFound("USER_NOT_FOUND", "User not found");

  target.status = input.status;
  await target.save();

  if (input.status === "suspended") {
    // Existing sessions must stop working immediately.
    await RefreshTokenModel.updateMany(
      { userId: target._id, revokedAt: null },
      { $set: { revokedAt: new Date() } },
    );
  }

  await recordAudit({
    actorId: String(actor._id),
    action: input.status === "suspended" ? "user.suspend" : "user.restore",
    targetType: "user",
    targetId: String(target._id),
    metadata: { status: input.status, reason: input.reason ?? null },
    req,
  });

  return target.toObject() as User;
}

export async function listReports(input: AdminReportListInput) {
  const filter: Record<string, unknown> = {};
  if (input.status) filter.status = input.status;

  const { skip, limit } = toSkipLimit(input);
  const [items, total] = await Promise.all([
    ReportModel.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    ReportModel.countDocuments(filter),
  ]);
  return { items, total };
}

export async function updateReport(
  actor: User,
  reportId: string,
  input: ReportUpdateInput,
  req: Request,
) {
  const report = await ReportModel.findById(reportId);
  if (!report) throw AppError.notFound("REPORT_NOT_FOUND", "Report not found");

  const closing = input.status === "resolved" || input.status === "dismissed";
  report.status = input.status;
  report.resolutionNote = input.resolutionNote ?? report.resolutionNote ?? null;
  report.resolvedBy = closing ? actor._id : null;
  report.resolvedAt = closing ? new Date() : null;
  await report.save();

  await recordAudit({
    actorId: String(actor._id),
    action: "report.update",
    targetType: report.targetType,
    targetId: String(report.targetId),
    metadata: { reportId: String(report._id), status: input.status },
    req,
  });

  return report.toObject();
}

export async function listAuditLogs(input: {
  page: number;
  limit: number;
  action?: string;
}) {
  const filter: Record<string, unknown> = {};
  if (input.action) filter.action = input.action;

  const { skip, limit } = toSkipLimit(input);
  const [items, total] = await Promise.all([
    AuditLogModel.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    AuditLogModel.countDocuments(filter),
  ]);
  return { items, total };
}

export async function recordChallengeAudit(
  actor: User,
  action: string,
  challengeId: string,
  metadata: Record<string, unknown>,
  req: Request,
): Promise<void> {
  await recordAudit({
    actorId: String(actor._id),
    action,
    targetType: "challenge",
    targetId: challengeId,
    metadata,
    req,
  });
}
