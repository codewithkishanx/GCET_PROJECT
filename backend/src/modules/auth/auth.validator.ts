import { z } from "zod";

const usernameSchema = z
  .string()
  .trim()
  .min(3, "Username must be at least 3 characters")
  .max(24, "Username must be at most 24 characters")
  .regex(/^[A-Za-z0-9_]+$/, "Username may only contain letters, numbers and underscores");

const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .max(254)
  .refine((value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value), "Enter a valid email address");

const passwordSchema = z
  .string()
  .min(10, "Password must be at least 10 characters")
  .max(128, "Password must be at most 128 characters");

export const registerSchema = z
  .object({
    username: usernameSchema,
    email: emailSchema,
    password: passwordSchema,
  })
  .strict();

export const loginSchema = z
  .object({
    usernameOrEmail: z.string().trim().min(3).max(254).optional(),
    identifier: z.string().trim().min(3).max(254).optional(),
    email: z.string().trim().min(3).max(254).optional(),
    password: z.string().min(1).max(128),
  })
  .refine((data) => Boolean(data.usernameOrEmail || data.identifier || data.email), {
    message: "Username or email is required",
    path: ["usernameOrEmail"],
  })
  .transform((data) => ({
    usernameOrEmail: (data.usernameOrEmail || data.identifier || data.email)!,
    password: data.password,
  }));

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
