import { describe, expect, it } from "vitest";
import request from "supertest";
import { UserModel } from "@dsa/shared";
import {
  STRONG_PASSWORD,
  buildTestContext,
  csrfFrom,
  loginUser,
  registerUser,
} from "./helpers";

const ctx = buildTestContext();
const api = "/api/v1";

function setCookies(res: request.Response): string[] {
  return (res.headers["set-cookie"] ?? []) as unknown as string[];
}

describe("authentication", () => {
  it("registers a user, sets HttpOnly cookies and never returns the password hash", async () => {
    const res = await request(ctx.app).post(`${api}/auth/register`).send({
      username: "alice_01",
      email: "Alice@Example.com",
      password: STRONG_PASSWORD,
    });

    expect(res.status).toBe(201);
    expect(res.body.user.username).toBe("alice_01");
    expect(res.body.user.email).toBe("alice@example.com");
    expect(res.body.user.role).toBe("user");
    expect(JSON.stringify(res.body)).not.toContain("passwordHash");
    expect(JSON.stringify(res.body)).not.toContain(STRONG_PASSWORD);

    const cookies = setCookies(res);
    expect(cookies.some((cookie) => cookie.startsWith("dsa_at=") && cookie.includes("HttpOnly"))).toBe(true);
    expect(cookies.some((cookie) => cookie.startsWith("dsa_rt=") && cookie.includes("HttpOnly"))).toBe(true);
    expect(cookies.some((cookie) => cookie.startsWith("dsa_csrf="))).toBe(true);

    const stored = await UserModel.findOne({ username: "alice_01" }).select("+passwordHash").lean();
    expect(stored?.passwordHash).toBeTruthy();
    expect(stored?.passwordHash).not.toBe(STRONG_PASSWORD);
  });

  it("rejects duplicate usernames and emails case-insensitively", async () => {
    await registerUser(ctx.app, { username: "bob_01", email: "bob@example.com" });

    const duplicateName = await request(ctx.app).post(`${api}/auth/register`).send({
      username: "BOB_01",
      email: "other@example.com",
      password: STRONG_PASSWORD,
    });
    expect(duplicateName.status).toBe(409);
    expect(duplicateName.body.error.code).toBe("ACCOUNT_EXISTS");

    const duplicateEmail = await request(ctx.app).post(`${api}/auth/register`).send({
      username: "other_01",
      email: "BOB@example.com",
      password: STRONG_PASSWORD,
    });
    expect(duplicateEmail.status).toBe(409);
  });

  it("uses one generic message for unknown accounts and wrong passwords", async () => {
    await registerUser(ctx.app, { username: "carol_01" });

    const wrongPassword = await request(ctx.app).post(`${api}/auth/login`).send({
      usernameOrEmail: "carol_01",
      password: "definitely-wrong",
    });
    const unknownUser = await request(ctx.app).post(`${api}/auth/login`).send({
      usernameOrEmail: "nobody_here",
      password: STRONG_PASSWORD,
    });

    expect(wrongPassword.status).toBe(401);
    expect(unknownUser.status).toBe(401);
    expect(wrongPassword.body.error.code).toBe(unknownUser.body.error.code);
    expect(wrongPassword.body.error.message).toBe(unknownUser.body.error.message);
  });

  it("requires authentication for the current-user endpoint", async () => {
    const res = await request(ctx.app).get(`${api}/auth/me`);
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("AUTH_REQUIRED");
    expect(res.body.error.requestId).toBeTruthy();
  });

  it("rejects state-changing requests without a CSRF token", async () => {
    const user = await registerUser(ctx.app);
    const res = await user.agent.patch(`${api}/users/me`).send({ bio: "no token" });
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe("CSRF_INVALID");
  });

  it("rotates refresh tokens and revokes the family when an old token is replayed", async () => {
    await registerUser(ctx.app, { username: "dave_01" });

    const login = await request(ctx.app)
      .post(`${api}/auth/login`)
      .send({ usernameOrEmail: "dave_01", password: STRONG_PASSWORD });
    expect(login.status).toBe(200);

    const cookies = setCookies(login);
    const refreshCookie = cookies.find((cookie) => cookie.startsWith("dsa_rt="))!;
    const oldRefresh = refreshCookie.split(";")[0]!;
    const csrf = csrfFrom(login);

    const rotated = await request(ctx.app)
      .post(`${api}/auth/refresh`)
      .set("Cookie", [`${oldRefresh}`, `dsa_csrf=${csrf}`])
      .set("x-csrf-token", csrf);
    expect(rotated.status).toBe(200);

    const replay = await request(ctx.app)
      .post(`${api}/auth/refresh`)
      .set("Cookie", [`${oldRefresh}`, `dsa_csrf=${csrf}`])
      .set("x-csrf-token", csrf);
    expect(replay.status).toBe(401);
    expect(replay.body.error.code).toBe("INVALID_REFRESH_TOKEN");

    // Reuse detection revokes every live session for that user.
    const sessions = await (await import("@dsa/shared")).RefreshTokenModel.find({
      userId: login.body.user.id,
      revokedAt: null,
    });
    expect(sessions).toHaveLength(0);
  });

  it("blocks suspended accounts at login and on existing sessions", async () => {
    const user = await registerUser(ctx.app, { username: "erin_01" });
    await UserModel.updateOne({ _id: user.id }, { $set: { status: "suspended" } });

    const login = await request(ctx.app)
      .post(`${api}/auth/login`)
      .send({ usernameOrEmail: "erin_01", password: STRONG_PASSWORD });
    expect(login.status).toBe(403);
    expect(login.body.error.code).toBe("ACCOUNT_SUSPENDED");

    const me = await user.agent.get(`${api}/auth/me`);
    expect(me.status).toBe(403);
    expect(me.body.error.code).toBe("ACCOUNT_SUSPENDED");
  });

  it("logs out by revoking the refresh session and clearing cookies", async () => {
    const user = await registerUser(ctx.app, { username: "frank_01" });

    const logout = await user.agent
      .post(`${api}/auth/logout`)
      .set("x-csrf-token", user.csrf);
    expect(logout.status).toBe(204);

    const me = await user.agent.get(`${api}/auth/me`);
    expect(me.status).toBe(401);
  });

  it("normalizes usernames so login is case-insensitive", async () => {
    await registerUser(ctx.app, { username: "grace_01" });
    const agent = await loginUser(ctx.app, "GRACE_01");
    const me = await agent.agent.get(`${api}/auth/me`);
    expect(me.status).toBe(200);
    expect(me.body.user.username).toBe("grace_01");
  });
});
