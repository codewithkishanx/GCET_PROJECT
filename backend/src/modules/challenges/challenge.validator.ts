import { z } from "zod";
import { CHALLENGE_STATUSES, DIFFICULTIES, LANGUAGES } from "@dsa/shared";

const languageEnum = z.enum(LANGUAGES);
const difficultyEnum = z.enum(DIFFICULTIES);
const statusEnum = z.enum(CHALLENGE_STATUSES);

const exampleSchema = z
  .object({
    input: z.string().max(4_000),
    output: z.string().max(4_000),
    explanation: z.string().max(2_000).nullable().optional(),
  })
  .strict();

const hiddenTestSchema = z
  .object({
    name: z.string().trim().max(120).nullable().optional(),
    stdin: z.string().max(20_000),
    expectedStdout: z.string().max(20_000),
  })
  .strict();

const codeMapSchema = z
  .record(z.string().max(20), z.string().max(100_000))
  .refine(
    (value) => Object.keys(value).every((key) => (LANGUAGES as readonly string[]).includes(key)),
    { message: "starterCode contains an unsupported language" },
  );

const challengeFields = {
  title: z.string().trim().min(3).max(160),
  slug: z
    .string()
    .trim()
    .min(3)
    .max(160)
    .regex(/^[a-z0-9-]+$/, "Slug may only contain lowercase letters, numbers and dashes")
    .optional(),
  description: z.string().trim().min(20).max(40_000),
  topic: z.string().trim().min(2).max(80),
  difficulty: difficultyEnum,
  constraints: z.array(z.string().trim().max(300)).max(30).optional(),
  examples: z.array(exampleSchema).max(20).optional(),
  starterCode: codeMapSchema,
  supportedLanguages: z.array(languageEnum).min(1).max(LANGUAGES.length),
  hiddenTests: z.array(hiddenTestSchema).min(1).max(50),
  referenceSolutions: codeMapSchema.optional(),
  timeLimitMs: z.number().int().min(100).max(15_000).optional(),
  memoryLimitMb: z.number().int().min(32).max(512).optional(),
  outputLimitBytes: z.number().int().min(1_024).max(1_048_576).optional(),
  points: z.number().int().min(0).max(10_000).optional(),
  rewardPolicyVersion: z.number().int().min(1).max(100).optional(),
  status: statusEnum.optional(),
};

export const createChallengeSchema = z
  .object(challengeFields)
  .strict()
  .superRefine((value, ctx) => {
    for (const language of value.supportedLanguages) {
      if (!value.starterCode[language]) {
        ctx.addIssue({
          code: "custom",
          path: ["starterCode", language],
          message: `Starter code is required for ${language}`,
        });
      }
    }
  });

export const updateChallengeSchema = z
  .object({
    ...challengeFields,
    title: challengeFields.title.optional(),
    description: challengeFields.description.optional(),
    topic: challengeFields.topic.optional(),
    difficulty: challengeFields.difficulty.optional(),
    starterCode: challengeFields.starterCode.optional(),
    supportedLanguages: challengeFields.supportedLanguages.optional(),
    hiddenTests: challengeFields.hiddenTests.optional(),
  })
  .strict();

export const challengeListQuerySchema = z
  .object({
    topic: z.string().trim().max(80).optional(),
    difficulty: difficultyEnum.optional(),
    language: languageEnum.optional(),
    q: z.string().trim().max(100).optional(),
    search: z.string().trim().max(100).optional(),
    cursor: z.string().trim().max(100).nullable().optional(),
    page: z.coerce.number().int().min(1).max(10_000).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
  })
  .transform((data) => ({
    topic: data.topic === "all" ? undefined : data.topic,
    difficulty: data.difficulty,
    language: data.language,
    q: data.q || data.search,
    page: data.cursor && !isNaN(Number(data.cursor)) ? Number(data.cursor) : data.page,
    limit: data.limit,
  }));

export const adminChallengeListQuerySchema = z
  .object({
    status: statusEnum.optional(),
    topic: z.string().trim().max(80).optional(),
    q: z.string().trim().max(100).optional(),
    page: z.coerce.number().int().min(1).max(10_000).default(1),
    limit: z.coerce.number().int().min(1).max(50).default(20),
  })
  .strict();

export type CreateChallengeInput = z.infer<typeof createChallengeSchema>;
export type UpdateChallengeInput = z.infer<typeof updateChallengeSchema>;
export type ChallengeListInput = z.infer<typeof challengeListQuerySchema>;
export type AdminChallengeListInput = z.infer<typeof adminChallengeListQuerySchema>;
