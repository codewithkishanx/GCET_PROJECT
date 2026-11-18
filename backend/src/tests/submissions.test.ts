import { describe, expect, it } from "vitest";
import { SubmissionModel } from "@dsa/shared";
import { createApp } from "../app";
import { loadConfig } from "../config/env";
import {
  buildTestContext,
  registerUser,
  seedChallenge,
  STRONG_PASSWORD,
} from "./helpers";

const api = "/api/v1";

describe("submissions", () => {
  it("queues a submission and exposes a polling URL", async () => {
    const ctx = buildTestContext();
    const user = await registerUser(ctx.app, { username: "submit_01" });
    const challenge = await seedChallenge();

    const res = await user.agent
      .post(`${api}/challenges/${challenge._id}/submissions`)
      .set("x-csrf-token", user.csrf)
      .send({ language: "python", sourceCode: "print(1)\n" });

    expect(res.status).toBe(202);
    expect(res.body.submission.status).toBe("queued");
    expect(res.body.pollUrl).toBe(`/api/v1/submissions/${res.body.submission.id}`);
    expect(ctx.queue.jobs).toContain(res.body.submission.id);

    const stored = await SubmissionModel.findById(res.body.submission.id)
      .select("+sourceCode")
      .lean();
    expect(stored?.sourceCode).toBe("print(1)\n");
    expect(stored?.status).toBe("queued");
  });

  it("rejects languages the challenge does not support", async () => {
    const ctx = buildTestContext();
    const user = await registerUser(ctx.app);
    const challenge = await seedChallenge({ supportedLanguages: ["python"] });

    const res = await user.agent
      .post(`${api}/challenges/${challenge._id}/submissions`)
      .set("x-csrf-token", user.csrf)
      .send({ language: "cpp", sourceCode: "int main(){return 0;}" });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("UNSUPPORTED_LANGUAGE");
    expect(await SubmissionModel.countDocuments()).toBe(0);
  });

  it("enforces the configured source size limit", async () => {
    const ctx = buildTestContext({ maxSourceBytes: 1_024 });
    const user = await registerUser(ctx.app);
    const challenge = await seedChallenge();

    const res = await user.agent
      .post(`${api}/challenges/${challenge._id}/submissions`)
      .set("x-csrf-token", user.csrf)
      .send({ language: "python", sourceCode: "x".repeat(2_000) });

    expect(res.status).toBe(413);
    expect(res.body.error.code).toBe("PAYLOAD_TOO_LARGE");
  });

  it("limits concurrent submissions per user", async () => {
    const ctx = buildTestContext({ maxActiveSubmissions: 2 });
    const user = await registerUser(ctx.app);
    const challenge = await seedChallenge();

    for (let index = 0; index < 2; index += 1) {
      const res = await user.agent
        .post(`${api}/challenges/${challenge._id}/submissions`)
        .set("x-csrf-token", user.csrf)
        .send({ language: "python", sourceCode: `print(${index})` });
      expect(res.status).toBe(202);
    }

    const third = await user.agent
      .post(`${api}/challenges/${challenge._id}/submissions`)
      .set("x-csrf-token", user.csrf)
      .send({ language: "python", sourceCode: "print(2)" });

    expect(third.status).toBe(429);
    expect(third.body.error.code).toBe("SUBMISSION_QUOTA");
  });

  it("returns 404 when another user requests the submission", async () => {
    const ctx = buildTestContext();
    const owner = await registerUser(ctx.app, { username: "owner_01" });
    const other = await registerUser(ctx.app, { username: "other_01" });
    const challenge = await seedChallenge();

    const created = await owner.agent
      .post(`${api}/challenges/${challenge._id}/submissions`)
      .set("x-csrf-token", owner.csrf)
      .send({ language: "python", sourceCode: "print(1)" });

    const res = await other.agent.get(`${api}/submissions/${created.body.submission.id}`);
    expect(res.status).toBe(404);
  });

  it("returns the source code to the owner", async () => {
    const ctx = buildTestContext();
    const user = await registerUser(ctx.app);
    const challenge = await seedChallenge();

    const created = await user.agent
      .post(`${api}/challenges/${challenge._id}/submissions`)
      .set("x-csrf-token", user.csrf)
      .send({ language: "python", sourceCode: "print(42)\n" });

    const detail = await user.agent.get(`${api}/submissions/${created.body.submission.id}`);
    expect(detail.status).toBe(200);
    expect(detail.body.submission.sourceCode).toBe("print(42)\n");
    expect(detail.body.challenge.slug).toBe(challenge.slug);
  });

  it("marks the submission failed when the queue is unavailable", async () => {
    const queue = {
      jobs: [] as string[],
      async enqueue(): Promise<string> {
        throw new Error("redis is down");
      },
      async counts() {
        return null;
      },
      async close() {
        /* noop */
      },
    };
    const config = { ...loadConfig(process.env as NodeJS.ProcessEnv), nodeEnv: "test" as const };
    const app = createApp({ config, queue });

    const user = await registerUser(app);
    const challenge = await seedChallenge();

    const res = await user.agent
      .post(`${api}/challenges/${challenge._id}/submissions`)
      .set("x-csrf-token", user.csrf)
      .send({ language: "python", sourceCode: `print(${STRONG_PASSWORD.length})` });

    expect(res.status).toBe(503);
    expect(res.body.error.code).toBe("EXECUTION_UNAVAILABLE");

    const stored = await SubmissionModel.findOne({ userId: user.id }).lean();
    expect(stored?.status).toBe("failed");
    expect(stored?.verdict).toBe("SYSTEM_ERROR");
  });

  it("lists the current user's submissions only", async () => {
    const ctx = buildTestContext();
    const user = await registerUser(ctx.app, { username: "history_01" });
    const other = await registerUser(ctx.app, { username: "history_02" });
    const challenge = await seedChallenge();

    await user.agent
      .post(`${api}/challenges/${challenge._id}/submissions`)
      .set("x-csrf-token", user.csrf)
      .send({ language: "python", sourceCode: "print(1)" });

    await other.agent
      .post(`${api}/challenges/${challenge._id}/submissions`)
      .set("x-csrf-token", other.csrf)
      .send({ language: "python", sourceCode: "print(2)" });

    const res = await user.agent.get(`${api}/users/me/submissions`);
    expect(res.status).toBe(200);
    expect(res.body.submissions).toHaveLength(1);
    expect(res.body.submissions[0].userId).toBe(user.id);
    expect(res.body.submissions[0].sourceCode).toBeUndefined();
  });

  it("validates the challenge id format", async () => {
    const ctx = buildTestContext();
    const user = await registerUser(ctx.app);

    const res = await user.agent
      .post(`${api}/challenges/not-an-id/submissions`)
      .set("x-csrf-token", user.csrf)
      .send({ language: "python", sourceCode: "print(1)" });

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe("CHALLENGE_NOT_FOUND");
  });
});
