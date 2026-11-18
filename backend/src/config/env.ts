import { z } from "zod";

const booleanString = z
  .enum(["true", "false"])
  .transform((value) => value === "true");

const envSchema = z
  .object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    PORT: z.coerce.number().int().min(1).max(65_535).default(4000),
    CLIENT_ORIGIN: z.string().trim().min(1).default("http://localhost:5173"),
    MONGODB_URI: z.string().refine((value) => value.startsWith("mongodb"), {
      message: "MONGODB_URI must start with mongodb:// or mongodb+srv://",
    }),
    REDIS_URL: z.string().trim().min(1).default("redis://127.0.0.1:6379"),
    JWT_ACCESS_SECRET: z.string().min(32, "JWT_ACCESS_SECRET must be at least 32 characters"),
    JWT_REFRESH_SECRET: z.string().min(32, "JWT_REFRESH_SECRET must be at least 32 characters"),
    ACCESS_TOKEN_TTL_MIN: z.coerce.number().int().min(1).max(1_440).default(15),
    REFRESH_TOKEN_TTL_DAYS: z.coerce.number().int().min(1).max(90).default(7),
    COOKIE_SECURE: booleanString.default(false),
    MAX_JSON_BODY: z.string().trim().min(2).max(20).default("100kb"),
    MAX_SOURCE_BYTES: z.coerce.number().int().min(1_024).max(200_000).default(50_000),
    MAX_ACTIVE_SUBMISSIONS_PER_USER: z.coerce.number().int().min(1).max(20).default(3),
    EXECUTION_QUEUE_NAME: z.string().trim().min(1).max(60).default("code-execution"),
    LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"]).default("info"),
  })
  .refine((value) => value.JWT_ACCESS_SECRET !== value.JWT_REFRESH_SECRET, {
    message: "JWT_ACCESS_SECRET and JWT_REFRESH_SECRET must differ",
    path: ["JWT_REFRESH_SECRET"],
  });

export interface AppConfig {
  nodeEnv: "development" | "test" | "production";
  isProd: boolean;
  port: number;
  clientOrigins: string[];
  mongoUri: string;
  redisUrl: string;
  jwtAccessSecret: string;
  jwtRefreshSecret: string;
  accessTokenTtlMin: number;
  refreshTokenTtlDays: number;
  cookieSecure: boolean;
  maxJsonBody: string;
  maxSourceBytes: number;
  maxActiveSubmissions: number;
  queueName: string;
  logLevel: string;
}

/**
 * Validates configuration at startup and fails fast with a readable report.
 * Secrets never appear in the error output.
 */
export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  const parsed = envSchema.safeParse(env);
  if (!parsed.success) {
    const problems = parsed.error.issues
      .map((issue) => `  - ${issue.path.join(".") || "env"}: ${issue.message}`)
      .join("\n");
    throw new Error(`Invalid environment configuration:\n${problems}`);
  }

  const value = parsed.data;
  return {
    nodeEnv: value.NODE_ENV,
    isProd: value.NODE_ENV === "production",
    port: value.PORT,
    clientOrigins: value.CLIENT_ORIGIN.split(",")
      .map((origin) => origin.trim())
      .filter(Boolean),
    mongoUri: value.MONGODB_URI,
    redisUrl: value.REDIS_URL,
    jwtAccessSecret: value.JWT_ACCESS_SECRET,
    jwtRefreshSecret: value.JWT_REFRESH_SECRET,
    accessTokenTtlMin: value.ACCESS_TOKEN_TTL_MIN,
    refreshTokenTtlDays: value.REFRESH_TOKEN_TTL_DAYS,
    cookieSecure: value.COOKIE_SECURE,
    maxJsonBody: value.MAX_JSON_BODY,
    maxSourceBytes: value.MAX_SOURCE_BYTES,
    maxActiveSubmissions: value.MAX_ACTIVE_SUBMISSIONS_PER_USER,
    queueName: value.EXECUTION_QUEUE_NAME,
    logLevel: value.LOG_LEVEL,
  };
}
