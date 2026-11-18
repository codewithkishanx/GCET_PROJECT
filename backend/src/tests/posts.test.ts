import { describe, expect, it } from "vitest";
import request from "supertest";
import { CommentModel, LikeModel, PostModel } from "@dsa/shared";
import { buildTestContext, registerUser } from "./helpers";

const ctx = buildTestContext();
const api = "/api/v1";

async function createPost(
  user: Awaited<ReturnType<typeof registerUser>>,
  overrides: Record<string, unknown> = {},
) {
  const res = await user.agent
    .post(`${api}/posts`)
    .set("x-csrf-token", user.csrf)
    .send({
      title: "Notes on two pointers",
      summary: "A short summary",
      contentMarkdown: "## Two pointers\n\nMove inward from both ends.\n",
      tags: ["arrays", "notes"],
      status: "published",
      ...overrides,
    });
  return res;
}

describe("community posts", () => {
  it("creates a published post, exposes it in the feed and renders sanitized HTML", async () => {
    const user = await registerUser(ctx.app, { username: "writer_01" });

    const created = await createPost(user, {
      contentMarkdown:
        "## Safe heading\n\n<script>alert('xss')</script>\n\n[link](https://example.com)\n",
    });
    expect(created.status).toBe(201);
    expect(created.body.post.author.username).toBe("writer_01");
    expect(created.body.post.publishedAt).toBeTruthy();

    const detail = await request(ctx.app).get(`${api}/posts/${created.body.post.slug}`);
    expect(detail.status).toBe(200);
    expect(detail.body.post.contentHtml).not.toContain("<script");
    expect(detail.body.post.contentHtml).toContain("Safe heading");
    expect(detail.body.post.contentHtml).toContain('rel="noopener noreferrer nofollow"');

    const feed = await request(ctx.app).get(`${api}/posts?tag=arrays`);
    expect(feed.status).toBe(200);
    expect(feed.body.posts).toHaveLength(1);
    expect(feed.body.posts[0].contentMarkdown).toBeUndefined();
  });

  it("hides drafts from other users but shows them to the author", async () => {
    const author = await registerUser(ctx.app, { username: "writer_02" });
    const other = await registerUser(ctx.app, { username: "writer_03" });

    const created = await createPost(author, { status: "draft" });
    expect(created.status).toBe(201);

    const anonymous = await request(ctx.app).get(`${api}/posts/${created.body.post.slug}`);
    expect(anonymous.status).toBe(404);

    const stranger = await other.agent.get(`${api}/posts/${created.body.post.slug}`);
    expect(stranger.status).toBe(404);

    const owner = await author.agent.get(`${api}/posts/${created.body.post.slug}`);
    expect(owner.status).toBe(200);
  });

  it("prevents another user from editing or deleting a post", async () => {
    const author = await registerUser(ctx.app, { username: "writer_04" });
    const other = await registerUser(ctx.app, { username: "writer_05" });
    const created = await createPost(author);

    const patch = await other.agent
      .patch(`${api}/posts/${created.body.post.id}`)
      .set("x-csrf-token", other.csrf)
      .send({ title: "Hijacked title" });
    expect(patch.status).toBe(404);

    const remove = await other.agent
      .delete(`${api}/posts/${created.body.post.id}`)
      .set("x-csrf-token", other.csrf);
    expect(remove.status).toBe(404);

    const unchanged = await PostModel.findById(created.body.post.id).lean();
    expect(unchanged?.title).toBe("Notes on two pointers");
    expect(unchanged?.status).toBe("published");
  });

  it("keeps likes idempotent with a unique index", async () => {
    const user = await registerUser(ctx.app, { username: "liker_01" });
    const created = await createPost(user);
    const postId = created.body.post.id as string;

    const first = await user.agent
      .post(`${api}/posts/${postId}/likes`)
      .set("x-csrf-token", user.csrf);
    const second = await user.agent
      .post(`${api}/posts/${postId}/likes`)
      .set("x-csrf-token", user.csrf);

    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    expect(second.body.likeCount).toBe(1);
    expect(await LikeModel.countDocuments({ postId })).toBe(1);

    const unlike = await user.agent
      .delete(`${api}/posts/${postId}/likes`)
      .set("x-csrf-token", user.csrf);
    expect(unlike.body.likeCount).toBe(0);
  });

  it("stores comments and keeps the counter consistent", async () => {
    const author = await registerUser(ctx.app, { username: "comment_01" });
    const reader = await registerUser(ctx.app, { username: "comment_02" });
    const created = await createPost(author);
    const postId = created.body.post.id as string;

    const comment = await reader.agent
      .post(`${api}/posts/${postId}/comments`)
      .set("x-csrf-token", reader.csrf)
      .send({ body: "Thanks, this helped." });
    expect(comment.status).toBe(201);
    expect(comment.body.comment.author.username).toBe("comment_02");

    const list = await request(ctx.app).get(`${api}/posts/${postId}/comments`);
    expect(list.status).toBe(200);
    expect(list.body.comments).toHaveLength(1);

    const post = await PostModel.findById(postId).lean();
    expect(post?.commentCount).toBe(1);
    expect(await CommentModel.countDocuments({ postId })).toBe(1);
  });

  it("rejects duplicate open reports for the same target", async () => {
    const user = await registerUser(ctx.app, { username: "reporter_01" });
    const created = await createPost(user);
    const targetId = created.body.post.id as string;

    const first = await user.agent
      .post(`${api}/reports`)
      .set("x-csrf-token", user.csrf)
      .send({ targetType: "post", targetId, reason: "spam", details: "duplicate" });
    expect(first.status).toBe(201);

    const second = await user.agent
      .post(`${api}/reports`)
      .set("x-csrf-token", user.csrf)
      .send({ targetType: "post", targetId, reason: "spam" });
    expect(second.status).toBe(409);
    expect(second.body.error.code).toBe("REPORT_ALREADY_OPEN");
  });

  it("paginates the feed", async () => {
    const user = await registerUser(ctx.app, { username: "writer_06" });
    for (let index = 0; index < 3; index += 1) {
      const res = await createPost(user, {
        title: `Paged note ${index}`,
        contentMarkdown: `## Note ${index}\n\nBody content for pagination.\n`,
      });
      expect(res.status).toBe(201);
    }

    const page = await request(ctx.app).get(`${api}/posts?limit=2&page=1`);
    expect(page.body.posts).toHaveLength(2);
    expect(page.body.pagination.total).toBe(3);
    expect(page.body.pagination.pages).toBe(2);
  });

  it("validates malformed pagination input", async () => {
    const res = await request(ctx.app).get(`${api}/posts?limit=9999`);
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });
});
