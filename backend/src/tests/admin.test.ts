import { describe, expect, it } from "vitest";
import request from "supertest";
import { AuditLogModel, ReportModel, UserModel } from "@dsa/shared";
import {
  buildTestContext,
  createAdmin,
  loginUser,
  registerUser,
} from "./helpers";

const ctx = buildTestContext();
const api = "/api/v1";

describe("admin authorization and moderation", () => {
  it("protects the overview with authentication and the admin role", async () => {
    const anonymous = await request(ctx.app).get(`${api}/admin/overview`);
    expect(anonymous.status).toBe(401);

    const user = await registerUser(ctx.app, { username: "not_admin" });
    const forbidden = await user.agent.get(`${api}/admin/overview`);
    expect(forbidden.status).toBe(403);
    expect(forbidden.body.error.code).toBe("FORBIDDEN");

    const admin = await createAdmin(ctx.app);
    const allowed = await admin.agent.get(`${api}/admin/overview`);
    expect(allowed.status).toBe(200);
    expect(allowed.body.counts.users).toBeGreaterThanOrEqual(2);
    expect(allowed.body.execution).toBeTruthy();
  });

  it("suspends a user, revokes their sessions and records an audit entry", async () => {
    const admin = await createAdmin(ctx.app);
    const victim = await registerUser(ctx.app, { username: "victim_01" });

    const res = await admin.agent
      .patch(`${api}/admin/users/${victim.id}/status`)
      .set("x-csrf-token", admin.csrf)
      .send({ status: "suspended", reason: "spam" });

    expect(res.status).toBe(200);
    expect(res.body.user.status).toBe("suspended");

    const blocked = await victim.agent.get(`${api}/auth/me`);
    expect(blocked.status).toBe(403);

    const audit = await AuditLogModel.findOne({ action: "user.suspend" }).lean();
    expect(audit).toBeTruthy();
    expect(audit?.targetId).toBe(victim.id);
    expect(JSON.stringify(audit?.metadata)).not.toContain("password");

    const login = await request(ctx.app)
      .post(`${api}/auth/login`)
      .send({ usernameOrEmail: "victim_01", password: "correct-horse-battery" });
    expect(login.status).toBe(403);
  });

  it("refuses to let an admin suspend their own account", async () => {
    const admin = await createAdmin(ctx.app);

    const res = await admin.agent
      .patch(`${api}/admin/users/${admin.id}/status`)
      .set("x-csrf-token", admin.csrf)
      .send({ status: "suspended" });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("SELF_SUSPEND");

    const stored = await UserModel.findById(admin.id).lean();
    expect(stored?.status).toBe("active");
  });

  it("restores a suspended account", async () => {
    const admin = await createAdmin(ctx.app);
    const user = await registerUser(ctx.app, { username: "restore_01" });

    await admin.agent
      .patch(`${api}/admin/users/${user.id}/status`)
      .set("x-csrf-token", admin.csrf)
      .send({ status: "suspended" });

    const restored = await admin.agent
      .patch(`${api}/admin/users/${user.id}/status`)
      .set("x-csrf-token", admin.csrf)
      .send({ status: "active" });
    expect(restored.status).toBe(200);
    expect(restored.body.user.status).toBe("active");

    const loggedIn = await loginUser(ctx.app, "restore_01");
    expect(loggedIn.id).toBe(user.id);
  });

  it("resolves reports and records the moderator", async () => {
    const admin = await createAdmin(ctx.app);
    const reporter = await registerUser(ctx.app, { username: "report_admin_01" });

    const post = await reporter.agent
      .post(`${api}/posts`)
      .set("x-csrf-token", reporter.csrf)
      .send({
        title: "Reported post",
        contentMarkdown: "## Reported content\n\nThis post will be reported.\n",
        status: "published",
      });
    expect(post.status).toBe(201);

    const created = await reporter.agent
      .post(`${api}/reports`)
      .set("x-csrf-token", reporter.csrf)
      .send({ targetType: "post", targetId: post.body.post.id, reason: "spam" });
    expect(created.status).toBe(201);

    const updated = await admin.agent
      .patch(`${api}/admin/reports/${created.body.report.id}`)
      .set("x-csrf-token", admin.csrf)
      .send({ status: "resolved", resolutionNote: "Confirmed spam" });
    expect(updated.status).toBe(200);
    expect(updated.body.report.status).toBe("resolved");

    const stored = await ReportModel.findById(created.body.report.id).lean();
    expect(stored?.resolvedBy?.toString()).toBe(admin.id);

    const logs = await admin.agent.get(`${api}/admin/audit-logs?action=report.update`);
    expect(logs.status).toBe(200);
    expect(logs.body.logs.length).toBeGreaterThanOrEqual(1);
  });

  it("moderates a post and hides it from the public feed", async () => {
    const admin = await createAdmin(ctx.app);
    const author = await registerUser(ctx.app, { username: "post_author_01" });

    const post = await author.agent
      .post(`${api}/posts`)
      .set("x-csrf-token", author.csrf)
      .send({
        title: "Post to moderate",
        contentMarkdown: "## Body\n\nSome content that will be hidden.\n",
        status: "published",
      });
    expect(post.status).toBe(201);

    const moderated = await admin.agent
      .patch(`${api}/admin/posts/${post.body.post.id}/status`)
      .set("x-csrf-token", admin.csrf)
      .send({ status: "hidden" });
    expect(moderated.status).toBe(200);
    expect(moderated.body.post.status).toBe("hidden");

    const feed = await request(ctx.app).get(`${api}/posts`);
    expect(feed.body.posts).toHaveLength(0);

    const audit = await AuditLogModel.findOne({ action: "post.moderate" }).lean();
    expect(audit).toBeTruthy();
  });
});

