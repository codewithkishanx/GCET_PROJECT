import { z } from "zod";
import { REPORT_REASONS, REPORT_TARGET_TYPES } from "@dsa/shared";

const tagsSchema = z.array(z.string().trim().min(1).max(30)).max(6);

export const createPostSchema = z
  .object({
    title: z.string().trim().min(3).max(160),
    summary: z.string().trim().max(400).optional(),
    contentMarkdown: z.string().min(20, "Post content is too short").max(60_000),
    tags: tagsSchema.optional(),
    status: z.enum(["draft", "published"]).default("draft"),
  })
  .strict();

export const updatePostSchema = z
  .object({
    title: z.string().trim().min(3).max(160).optional(),
    summary: z.string().trim().max(400).optional(),
    contentMarkdown: z.string().min(20).max(60_000).optional(),
    tags: tagsSchema.optional(),
    status: z.enum(["draft", "published"]).optional(),
  })
  .strict();

export const postListQuerySchema = z
  .object({
    tag: z.string().trim().max(30).optional(),
    author: z.string().trim().max(24).optional(),
    q: z.string().trim().max(100).optional(),
    search: z.string().trim().max(100).optional(),
    status: z.string().trim().optional(),
    cursor: z.string().trim().max(100).nullable().optional(),
    page: z.coerce.number().int().min(1).max(10_000).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
  })
  .transform((data) => ({
    tag: data.tag,
    author: data.author,
    q: data.q || data.search,
    page: data.cursor && !isNaN(Number(data.cursor)) ? Number(data.cursor) : data.page,
    limit: data.limit,
  }));

export const commentCreateSchema = z
  .object({
    body: z.string().trim().min(1, "Comment cannot be empty").max(2_000),
  })
  .strict();

export const reportCreateSchema = z
  .object({
    targetType: z.enum(REPORT_TARGET_TYPES),
    targetId: z
      .string()
      .regex(/^[a-f0-9]{24}$/i, "targetId must be a 24 character identifier"),
    reason: z.enum(REPORT_REASONS),
    details: z.string().trim().max(1_000).optional(),
  })
  .strict();

export type CreatePostInput = z.infer<typeof createPostSchema>;
export type UpdatePostInput = z.infer<typeof updatePostSchema>;
export type PostListInput = z.infer<typeof postListQuerySchema>;
export type CommentCreateInput = z.infer<typeof commentCreateSchema>;
export type ReportCreateInput = z.infer<typeof reportCreateSchema>;
