import { describe, expect, it } from "vitest";
import request from "supertest";
import { buildTestContext, registerUser } from "./helpers";

const ctx = buildTestContext();
const api = "/api/v1";

describe("users and profiles", () => {
  it("updates only permitted profile fields", async () => {
    const user = await registerUser(ctx.app, { username: "profile_01" });

    const res = await user.agent
      .patch(`${api}/users/me`)
      .set("x-csrf-token", user.csrf)
      .send({
        displayName: "Profile One",
        bio: "Learning algorithms",
        avatarUrl: "https://example.com/avatar.png",
      });

    expect(res.status).toBe(200);
    expect(res.body.user.displayName).toBe("Profile One");
    expect(res.body.user.bio).toBe("Learning algorithms");
    expect(res.body.user.avatarUrl).toBe("https://example.com/avatar.png");
  });

  it("rejects attempts to change role, points or account status", async () => {
    const user = await registerUser(ctx.app, { username: "profile_02" });

    for (const payload of [{ role: "admin" }, { points: 999_999 }, { status: "suspended" }]) {
      const res = await user.agent
        .patch(`${api}/users/me`)
        .set("x-csrf-token", user.csrf)
        .send(payload);
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe("VALIDATION_ERROR");
    }
  });

  it("never exposes private fields on the public profile", async () => {
    await registerUser(ctx.app, { username: "profile_03" });

    const res = await request(ctx.app).get(`${api}/users/profile_03`);
    expect(res.status).toBe(200);
    expect(res.body.user.email).toBeUndefined();
    expect(res.body.user.role).toBeUndefined();
    expect(res.body.user.status).toBeUndefined();
    expect(res.body.user.username).toBe("profile_03");
  });

  it("returns rank and difficulty breakdown in user stats", async () => {
    const user = await registerUser(ctx.app, { username: "profile_04" });

    const res = await request(ctx.app).get(`${api}/users/${user.username}/stats`);
    expect(res.status).toBe(200);
    expect(res.body.stats.points).toBe(0);
    expect(res.body.stats.rank).toBeGreaterThanOrEqual(1);
    expect(typeof res.body.stats.acceptedByDifficulty).toBe("object");
  });

  it("returns 404 for an unknown public profile", async () => {
    const res = await request(ctx.app).get(`${api}/users/does_not_exist`);
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe("USER_NOT_FOUND");
  });
});
