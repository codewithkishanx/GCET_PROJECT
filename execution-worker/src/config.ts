import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  MONGODB_URI: z.string().refine((value) => value.startsWith("mongodb"), {
    message: "MONGODB_URI must start with mongodb:// or mongodb+srv://",
  }),
  REDIS_URL: z.string().trim().min(1).default("redis://127.0.0.1:6379"),
  EXECUTION_QUEUE_NAME: z.string().trim().min(1).max(60).default("code-execution"),
  EXECUTION_WORKER_CONCURRENCY: z.coerce.number().int().min(1).max(16).default(2),
  JUDGE_WORK_ROOT: z.string().trim().optional(),
  JUDGE_IMAGE_PYTHON: z.string().trim().min(1).default("dsa-judge-python:3.12"),
  JUDGE_IMAGE_NODE: z.string().trim().min(1).default("dsa-judge-node:24"),
  JUDGE_IMAGE_CPP: z.string().trim().min(1).default("dsa-judge-cpp:14"),
  JUDGE_MAX_CONTAINER_AGE_MS: z.coerce.number().int().min(60_000).default(600_000),
  LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"]).default("info"),
});

export interface WorkerConfig {
  nodeEnv: "development" | "test" | "production";
  mongoUri: string;
  redisUrl: string;
  queueName: string;
  concurrency: number;
  workRoot: string | null;
  images: Record<"python" | "javascript" | "cpp", string>;
  maxContainerAgeMs: number;
  logLevel: string;
}

export function loadWorkerConfig(env: NodeJS.ProcessEnv = process.env): WorkerConfig {
  const parsed = envSchema.safeParse(env);
  if (!parsed.success) {
    const problems = parsed.error.issues
      .map((issue) => `  - ${issue.path.join(".") || "env"}: ${issue.message}`)
      .join("\n");
    throw new Error(`Invalid worker configuration:\n${problems}`);
  }

  const value = parsed.data;
  return {
    nodeEnv: value.NODE_ENV,
    mongoUri: value.MONGODB_URI,
    redisUrl: value.REDIS_URL,
    queueName: value.EXECUTION_QUEUE_NAME,
    concurrency: value.EXECUTION_WORKER_CONCURRENCY,
    workRoot: value.JUDGE_WORK_ROOT?.trim() ? value.JUDGE_WORK_ROOT.trim() : null,
    images: {
      python: value.JUDGE_IMAGE_PYTHON,
      javascript: value.JUDGE_IMAGE_NODE,
      cpp: value.JUDGE_IMAGE_CPP,
    },
    maxContainerAgeMs: value.JUDGE_MAX_CONTAINER_AGE_MS,
    logLevel: value.LOG_LEVEL,
  };
}
