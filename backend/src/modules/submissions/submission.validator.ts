import { z } from "zod";
import { LANGUAGES } from "@dsa/shared";

export const createSubmissionSchema = z
  .object({
    language: z.enum(LANGUAGES),
    sourceCode: z.string().min(1, "Source code is required").max(200_000),
  })
  .strict();

export type CreateSubmissionInput = z.infer<typeof createSubmissionSchema>;
