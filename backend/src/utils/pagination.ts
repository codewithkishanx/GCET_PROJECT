import { z } from "zod";

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).max(10_000).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type PaginationInput = z.infer<typeof paginationSchema>;

export function toSkipLimit(input: PaginationInput): { skip: number; limit: number } {
  return { skip: (input.page - 1) * input.limit, limit: input.limit };
}

export function paginationMeta(
  total: number,
  input: PaginationInput,
): { total: number; page: number; limit: number; pages: number } {
  return {
    total,
    page: input.page,
    limit: input.limit,
    pages: Math.max(1, Math.ceil(total / input.limit)),
  };
}

/** Escapes user-supplied text before it is used inside a RegExp. */
export function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
