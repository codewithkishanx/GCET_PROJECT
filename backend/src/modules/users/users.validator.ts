import { z } from "zod";

export const updateProfileSchema = z
  .object({
    displayName: z.string().trim().max(60).nullable().optional(),
    bio: z.string().trim().max(500).nullable().optional(),
    avatarUrl: z
      .string()
      .trim()
      .max(500)
      .refine((value) => value === "" || /^https?:\/\/\S+$/i.test(value), {
        message: "Avatar URL must start with http:// or https://",
      })
      .nullable()
      .optional(),
  })
  .strict();

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;

export const submissionListQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).max(10_000).default(1),
    cursor: z.string().trim().max(100).nullable().optional(),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    challengeId: z.string().trim().max(40).optional(),
  })
  .transform((data) => ({
    page: data.cursor && !isNaN(Number(data.cursor)) ? Number(data.cursor) : data.page,
    limit: data.limit,
    challengeId: data.challengeId,
  }));
