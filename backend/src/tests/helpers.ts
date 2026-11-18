import crypto from "node:crypto";
import type { Express } from "express";
import request from "supertest";
import { UserModel } from "@dsa/shared";
import { createApp } from "../app";
import { loadConfig, type AppConfig } from "../config/env";
import {
  createInMemoryQueue,
  type ExecutionQueue,
} from "../queues/execution.queue";
import { hashPassword } from "../utils/password";

export interface TestContext {
  app: Express;
  config: AppConfig;
  queue: ExecutionQueue & { jobs: string[] };
}

export function buildTestContext(overrides: Partial<AppConfig> = {}): TestContext {
  const queue = createInMemoryQueue();
  const config: AppConfig = {
    ...loadConfig(process.env as NodeJS.ProcessEnv),
    nodeEnv: "test",
    ...overrides,
  };
  return { app: createApp({ config, queue }), config, queue };
}

export const STRONG_PASSWORD = "correct-horse-battery";

export interface TestUser {
  agent: ReturnType<typeof request.agent>;
  id: string;
  username: string;
  email: string;
  csrf: string;
}

/**
 * Resolves the CSRF token the HTTP agent will actually send back.
 *
 * A single response can carry two `dsa_csrf` cookies: the bootstrap cookie from
 * `ensureCsrfCookie` middleware and the rotated one from the controller. Cookie
 * jars keep the last value, so the last header wins here as well. The token
 * echoed in the JSON body is the same value and is used as a fallback.
 */
export function csrfFrom(res: request.Response): string {
  const cookies = (res.headers["set-cookie"] ?? []) as unknown as string[];
  const matching = cookies.filter((cookie) => cookie.startsWith("dsa_csrf="));
  const raw = matching[matching.length - 1];
  if (raw) {
    const value = raw.split(";")[0]?.split("=")[1];
    if (value) return decodeURIComponent(value);
  }
  // Fall back to the token echoed in the JSON body.
  return String((res.body as { csrfToken?: string }).csrfToken ?? "");
}

export async function registerUser(
  app: Express,
  overrides: { username?: string; email?: string; password?: string } = {},
): Promise<TestUser> {
  const username = overrides.username ?? `user_${crypto.randomBytes(4).toString("hex")}`;
  const email = overrides.email ?? `${username}@example.com`;
  const agent = request.agent(app);

  const res = await agent.post("/api/v1/auth/register").send({
    username,
    email,
    password: overrides.password ?? STRONG_PASSWORD,
  });

  if (res.status !== 201) {
    throw new Error(`register failed: ${res.status} ${JSON.stringify(res.body)}`);
  }

  return {
    agent,
    id: res.body.user.id as string,
    username,
    email,
    csrf: csrfFrom(res),
  };
}

export async function loginUser(
  app: Express,
  username: string,
  password = STRONG_PASSWORD,
): Promise<TestUser> {
  const agent = request.agent(app);
  const res = await agent.post("/api/v1/auth/login").send({ usernameOrEmail: username, password });
  if (res.status !== 200) {
    throw new Error(`login failed: ${res.status} ${JSON.stringify(res.body)}`);
  }
  return {
    agent,
    id: res.body.user.id as string,
    username,
    email: res.body.user.email as string,
    csrf: csrfFrom(res),
  };
}

export async function csrfTokenFor(agent: ReturnType<typeof request.agent>): Promise<string> {
  const res = await agent.get("/api/v1/health");
  return csrfFrom(res);
}

export async function createAdmin(
  app: Express,
  username = `admin_${crypto.randomBytes(3).toString("hex")}`,
): Promise<TestUser> {
  await UserModel.create({
    username,
    email: `${username}@example.com`,
    passwordHash: await hashPassword(STRONG_PASSWORD),
    role: "admin",
    status: "active",
  });
  return loginUser(app, username);
}

export function authHeaders(csrf: string): Record<string, string> {
  return { "x-csrf-token": csrf };
}

export async function seedChallenge(overrides: Record<string, unknown> = {}) {
  const { ChallengeModel } = await import("@dsa/shared");
  const slug = `test-challenge-${crypto.randomBytes(4).toString("hex")}`;
  return ChallengeModel.create({
    title: "Test challenge",
    slug,
    description: "A deterministic challenge used by the API test suite.",
    topic: "arrays",
    difficulty: "easy",
    constraints: ["1 <= n <= 10"],
    examples: [{ input: "1", output: "1", explanation: null }],
    starterCode: new Map([["python", "print(1)\n"]]),
    supportedLanguages: ["python"],
    hiddenTests: [{ name: "one", stdin: "1\n", expectedStdout: "1\n" }],
    referenceSolutions: new Map([["python", "print(1)\n"]]),
    timeLimitMs: 1_000,
    memoryLimitMb: 128,
    outputLimitBytes: 64_000,
    points: 50,
    rewardPolicyVersion: 1,
    status: "published",
    ...overrides,
  });
}
