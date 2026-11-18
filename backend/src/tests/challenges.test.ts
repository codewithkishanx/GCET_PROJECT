import { describe, expect, it } from "vitest";
import request from "supertest";
import { ChallengeModel } from "@dsa/shared";
import {
  buildTestContext,
  createAdmin,
  registerUser,
  seedChallenge,
} from "./helpers";

const ctx = buildTestContext();
const api = "/api/v1";

const adminChallengePayload = {
  title: "Hidden tests live server side",
  description: "A challenge created through the admin API to verify field projection.",
  topic: "arrays",
  difficulty: "easy",
  starterCode: { python: "print(1)\n" },
  supportedLanguages: ["python"],
  hiddenTests: [
    { name: "secret one", stdin: "1\n", expectedStdout: "SECRET_EXPECTED_ONE\n" },
    { name: "secret two", stdin: "2\n", expectedStdout: "SECRET_EXPECTED_TWO\n" },
  ],
  referenceSolutions: { python: "print('SECRET_REFERENCE')\n" },
  points: 80,
  status: "published",
};

describe("challenges", () => {
  it("lists only published challenges and never leaks server-side fields", async () => {
    await seedChallenge({ slug: "published-one", status: "published" });
    await seedChallenge({ slug: "draft-one", status: "draft" });

    const list = await request(ctx.app).get(`${api}/challenges`);
    expect(list.status).toBe(200);
    expect(list.body.challenges.map((item: { slug: string }) => item.slug)).toContain("published-one");
    expect(list.body.challenges.map((item: { slug: string }) => item.slug)).not.toContain("draft-one");

    const raw = JSON.stringify(list.body);
    expect(raw).not.toContain("hiddenTests");
    expect(raw).not.toContain("referenceSolutions");
    expect(raw).not.toContain("expectedStdout");
  });

  it("omits hidden tests and reference solutions from the public detail response", async () => {
    await seedChallenge({ slug: "detail-one" });

    const res = await request(ctx.app).get(`${api}/challenges/detail-one`);
    expect(res.status).toBe(200);
    expect(res.body.challenge.starterCode.python).toBeTruthy();

    const raw = JSON.stringify(res.body);
    expect(raw).not.toContain("hiddenTests");
    expect(raw).not.toContain("referenceSolutions");
  });

  it("hides draft and archived challenges from public routes", async () => {
    await seedChallenge({ slug: "draft-two", status: "draft" });
    expect((await request(ctx.app).get(`${api}/challenges/draft-two`)).status).toBe(404);
  });

  it("lets an admin create a challenge and keeps hidden data admin-only", async () => {
    const admin = await createAdmin(ctx.app);

    const created = await admin.agent
      .post(`${api}/admin/challenges`)
      .set("x-csrf-token", admin.csrf)
      .send(adminChallengePayload);

    expect(created.status).toBe(201);
    expect(created.body.challenge.hiddenTests).toHaveLength(2);
    expect(created.body.challenge.status).toBe("published");

    const publicDetail = await request(ctx.app).get(
      `${api}/challenges/${created.body.challenge.slug}`,
    );
    expect(publicDetail.status).toBe(200);
    const raw = JSON.stringify(publicDetail.body);
    expect(raw).not.toContain("SECRET_EXPECTED_ONE");
    expect(raw).not.toContain("SECRET_REFERENCE");
  });

  it("forbids non-admins from creating challenges", async () => {
    const user = await registerUser(ctx.app);

    const res = await user.agent
      .post(`${api}/admin/challenges`)
      .set("x-csrf-token", user.csrf)
      .send(adminChallengePayload);

    expect(res.status).toBe(403);
    expect(await ChallengeModel.countDocuments()).toBe(0);
  });

  it("rejects challenge payloads without starter code for every supported language", async () => {
    const admin = await createAdmin(ctx.app);

    const res = await admin.agent
      .post(`${api}/admin/challenges`)
      .set("x-csrf-token", admin.csrf)
      .send({
        ...adminChallengePayload,
        supportedLanguages: ["python", "cpp"],
      });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("archives a challenge so it disappears from public listings", async () => {
    const admin = await createAdmin(ctx.app);
    const challenge = await seedChallenge({ slug: "to-archive" });

    const res = await admin.agent
      .delete(`${api}/admin/challenges/${challenge._id}`)
      .set("x-csrf-token", admin.csrf);
    expect(res.status).toBe(204);

    const detail = await request(ctx.app).get(`${api}/challenges/to-archive`);
    expect(detail.status).toBe(404);
  });

  it("validates the source size limit", async () => {
    const user = await registerUser(ctx.app);
    const challenge = await seedChallenge({ slug: "size-check" });

    // Large enough to exceed MAX_SOURCE_BYTES (50 KB) but still under the JSON
    // body limit, so the submission route rather than the body parser rejects it.
    const res = await user.agent
      .post(`${api}/challenges/${challenge._id}/submissions`)
      .set("x-csrf-token", user.csrf)
      .send({ language: "python", sourceCode: "x".repeat(60_000) });

    expect(res.status).toBe(413);
    expect(res.body.error.code).toBe("PAYLOAD_TOO_LARGE");
  });
});
