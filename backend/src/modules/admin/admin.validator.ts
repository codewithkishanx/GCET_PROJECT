import { z } from "zod";
import {
  COMMENT_STATUSES,
  POST_STATUSES,
  REPORT_STATUSES,
  USER_STATUSES,
} from "@dsa/shared";

const moderationPostStatus = z.enum(
  POST_STATUSES.filter((status) => status !== "draft") as ["published", "hidden", "removed"],
);

export const adminUserListQuerySchema = z
  .object({
    q: z.string().trim().max(100).optional(),
    search: z.string().trim().max(100).optional(),
    status: z.string().trim().optional(),
    cursor: z.string().trim().max(100).nullable().optional(),
    page: z.coerce.number().int().min(1).max(10_000).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
  })
  .transform((data) => ({
    q: data.q || data.search,
    status:
      data.status && data.status !== "all" && (USER_STATUSES as readonly string[]).includes(data.status)
        ? (data.status as (typeof USER_STATUSES)[number])
        : undefined,
    page: data.cursor && !isNaN(Number(data.cursor)) ? Number(data.cursor) : data.page,
    limit: data.limit,
  }));

export const userStatusSchema = z
  .object({
    status: z.enum(USER_STATUSES),
    reason: z.string().trim().max(300).optional(),
  })
  .strict();

export const adminReportListQuerySchema = z
  .object({
    status: z.string().trim().optional(),
    cursor: z.string().trim().max(100).nullable().optional(),
    page: z.coerce.number().int().min(1).max(10_000).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
  })
  .transform((data) => ({
    status:
      data.status && data.status !== "all" && (REPORT_STATUSES as readonly string[]).includes(data.status)
        ? (data.status as (typeof REPORT_STATUSES)[number])
        : undefined,
    page: data.cursor && !isNaN(Number(data.cursor)) ? Number(data.cursor) : data.page,
    limit: data.limit,
  }));

export const reportUpdateSchema = z
  .object({
    status: z.enum(REPORT_STATUSES),
    resolutionNote: z.string().trim().max(500).optional(),
    note: z.string().trim().max(500).optional(),
  })
  .transform((data) => ({
    status: data.status,
    resolutionNote: data.resolutionNote || data.note,
  }));

export const postModerationSchema = z
  .object({ status: moderationPostStatus })
  .strict();

export const commentModerationSchema = z
  .object({ status: z.enum(COMMENT_STATUSES) })
  .strict();

export const auditListQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).max(10_000).default(1),
    limit: z.coerce.number().int().min(1).max(50).default(20),
    action: z.string().trim().max(80).optional(),
  })
  .strict();

export type UserStatusInput = z.infer<typeof userStatusSchema>;
export type ReportUpdateInput = z.infer<typeof reportUpdateSchema>;
export type AdminUserListInput = z.infer<typeof adminUserListQuerySchema>;
export type AdminReportListInput = z.infer<typeof adminReportListQuerySchema>;
