import mongoose from "mongoose";
import {
  CommentModel,
  LikeModel,
  PostModel,
  ReportModel,
  UserModel,
  type Comment,
  type Post,
  type User,
} from "@dsa/shared";
import { AppError } from "../../utils/errors";
import { escapeRegex, toSkipLimit } from "../../utils/pagination";
import { generateUniqueSlug, slugify } from "../../utils/slug";
import type { PostAuthorView } from "../../utils/serializers";
import type {
  CommentCreateInput,
  CreatePostInput,
  PostListInput,
  ReportCreateInput,
  UpdatePostInput,
} from "./post.validator";

const AUTHOR_SELECT = "username displayName";

export async function authorsFor(ids: string[]): Promise<Map<string, PostAuthorView>> {
  const unique = [...new Set(ids)];
  if (unique.length === 0) return new Map();

  const users = await UserModel.find({ _id: { $in: unique } })
    .select(AUTHOR_SELECT)
    .lean();
  const map = new Map<string, PostAuthorView>();
  for (const user of users) {
    map.set(String(user._id), {
      id: String(user._id),
      username: user.username,
      displayName: user.displayName ?? null,
    });
  }
  return map;
}

export async function authorFor(authorId: unknown): Promise<PostAuthorView | null> {
  const map = await authorsFor([String(authorId)]);
  return map.get(String(authorId)) ?? null;
}

export async function listPosts(
  input: PostListInput,
): Promise<{ items: Post[]; total: number }> {
  const filter: Record<string, unknown> = { status: "published" };

  if (input.tag) filter.tags = input.tag.toLowerCase();
  if (input.q) {
    const pattern = new RegExp(escapeRegex(input.q), "i");
    filter.$or = [{ title: pattern }, { summary: pattern }, { tags: pattern }];
  }
  if (input.author) {
    const author = await UserModel.findOne({ username: input.author.toLowerCase() })
      .select("_id")
      .lean();
    if (!author) return { items: [], total: 0 };
    filter.authorId = author._id;
  }

  const { skip, limit } = toSkipLimit(input);
  const [items, total] = await Promise.all([
    PostModel.find(filter).sort({ publishedAt: -1, createdAt: -1 }).skip(skip).limit(limit).lean(),
    PostModel.countDocuments(filter),
  ]);
  return { items, total };
}

export async function getPostBySlug(slug: string, viewer?: User): Promise<Post> {
  const post = await PostModel.findOne({ slug: slug.toLowerCase() }).lean<Post | null>();
  if (!post) throw AppError.notFound("POST_NOT_FOUND", "Post not found");

  const isAuthor = viewer ? String(post.authorId) === String(viewer._id) : false;
  const isAdmin = viewer?.role === "admin";
  if (post.status !== "published" && !isAuthor && !isAdmin) {
    throw AppError.notFound("POST_NOT_FOUND", "Post not found");
  }
  return post;
}

export async function createPost(authorId: string, input: CreatePostInput): Promise<Post> {
  const base = slugify(input.title, "post");
  const slug = await generateUniqueSlug(
    base,
    async (candidate) => (await PostModel.exists({ slug: candidate })) !== null,
  );

  return PostModel.create({
    authorId,
    title: input.title,
    slug,
    summary: input.summary ?? "",
    contentMarkdown: input.contentMarkdown,
    tags: (input.tags ?? []).map((tag) => tag.toLowerCase()),
    status: input.status,
    publishedAt: input.status === "published" ? new Date() : null,
  });
}

function assertCanEdit(post: Post, viewer: User): void {
  const isAuthor = String(post.authorId) === String(viewer._id);
  if (!isAuthor && viewer.role !== "admin") {
    // Hide existence from unrelated users.
    throw AppError.notFound("POST_NOT_FOUND", "Post not found");
  }
}

export async function updatePost(
  postId: string,
  viewer: User,
  input: UpdatePostInput,
): Promise<Post> {
  if (!mongoose.isValidObjectId(postId)) {
    throw AppError.notFound("POST_NOT_FOUND", "Post not found");
  }
  const post = await PostModel.findById(postId);
  if (!post) throw AppError.notFound("POST_NOT_FOUND", "Post not found");
  assertCanEdit(post, viewer);

  if (post.status === "removed" && viewer.role !== "admin") {
    throw AppError.forbidden("POST_REMOVED", "This post was removed by a moderator");
  }

  if (input.title !== undefined) post.title = input.title;
  if (input.summary !== undefined) post.summary = input.summary;
  if (input.contentMarkdown !== undefined) post.contentMarkdown = input.contentMarkdown;
  if (input.tags !== undefined) post.tags = input.tags.map((tag) => tag.toLowerCase());
  if (input.status !== undefined) {
    post.status = input.status;
    if (input.status === "published" && !post.publishedAt) {
      post.publishedAt = new Date();
    }
  }
  post.editCount += 1;

  await post.save();
  return post.toObject() as Post;
}

export async function removePost(postId: string, viewer: User): Promise<void> {
  if (!mongoose.isValidObjectId(postId)) {
    throw AppError.notFound("POST_NOT_FOUND", "Post not found");
  }
  const post = await PostModel.findById(postId).lean<Post | null>();
  if (!post) throw AppError.notFound("POST_NOT_FOUND", "Post not found");
  assertCanEdit(post, viewer);

  await PostModel.updateOne({ _id: postId }, { $set: { status: "removed" } });
}

async function assertPublishedPost(postId: string): Promise<Post> {
  if (!mongoose.isValidObjectId(postId)) {
    throw AppError.notFound("POST_NOT_FOUND", "Post not found");
  }
  const post = await PostModel.findById(postId).lean<Post | null>();
  if (!post || post.status !== "published") {
    throw AppError.notFound("POST_NOT_FOUND", "Post not found");
  }
  return post;
}

export async function setLike(
  postId: string,
  userId: string,
  liked: boolean,
): Promise<{ liked: boolean; likeCount: number }> {
  await assertPublishedPost(postId);

  if (liked) {
    const result = await LikeModel.updateOne(
      { userId, postId },
      { $setOnInsert: { userId, postId } },
      { upsert: true },
    );
    if (result.upsertedCount > 0) {
      await PostModel.updateOne({ _id: postId }, { $inc: { likeCount: 1 } });
    }
  } else {
    const result = await LikeModel.deleteOne({ userId, postId });
    if (result.deletedCount > 0) {
      await PostModel.updateOne(
        { _id: postId, likeCount: { $gt: 0 } },
        { $inc: { likeCount: -1 } },
      );
    }
  }

  const post = await PostModel.findById(postId).select("likeCount").lean();
  return { liked, likeCount: post?.likeCount ?? 0 };
}

export async function listComments(
  postId: string,
  page: { skip: number; limit: number },
): Promise<{ items: Comment[]; total: number }> {
  await assertPublishedPost(postId);
  const filter = { postId, status: "visible" as const };
  const [items, total] = await Promise.all([
    CommentModel.find(filter).sort({ createdAt: -1 }).skip(page.skip).limit(page.limit).lean(),
    CommentModel.countDocuments(filter),
  ]);
  return { items, total };
}

export async function addComment(
  postId: string,
  userId: string,
  input: CommentCreateInput,
): Promise<Comment> {
  await assertPublishedPost(postId);

  const comment = await CommentModel.create({
    postId,
    authorId: userId,
    body: input.body,
  });
  await PostModel.updateOne({ _id: postId }, { $inc: { commentCount: 1 } });
  return comment;
}

export async function createReport(
  reporterId: string,
  input: ReportCreateInput,
): Promise<{ id: string }> {
  const targetIds = input.targetId;

  const targetExists =
    input.targetType === "post"
      ? await PostModel.exists({ _id: targetIds })
      : input.targetType === "comment"
        ? await CommentModel.exists({ _id: targetIds })
        : await UserModel.exists({ _id: targetIds });

  if (!targetExists) {
    throw AppError.notFound("REPORT_TARGET_NOT_FOUND", "The reported item does not exist");
  }

  const existing = await ReportModel.exists({
    reporterId,
    targetType: input.targetType,
    targetId: targetIds,
    status: { $in: ["open", "reviewing"] },
  });
  if (existing) {
    throw AppError.conflict(
      "REPORT_ALREADY_OPEN",
      "You already have an open report for this item",
    );
  }

  const report = await ReportModel.create({
    reporterId,
    targetType: input.targetType,
    targetId: targetIds,
    reason: input.reason,
    details: input.details ?? "",
  });

  return { id: String(report._id) };
}

/** Admin moderation transition; the caller records the audit entry. */
export async function moderatePostStatus(
  postId: string,
  status: "published" | "hidden" | "removed",
): Promise<Post> {
  if (!mongoose.isValidObjectId(postId)) {
    throw AppError.notFound("POST_NOT_FOUND", "Post not found");
  }
  const post = await PostModel.findByIdAndUpdate(postId, { $set: { status } }, { new: true });
  if (!post) throw AppError.notFound("POST_NOT_FOUND", "Post not found");
  return post.toObject() as Post;
}

export async function moderateCommentStatus(
  commentId: string,
  status: "visible" | "hidden" | "removed",
): Promise<Comment> {
  if (!mongoose.isValidObjectId(commentId)) {
    throw AppError.notFound("COMMENT_NOT_FOUND", "Comment not found");
  }
  const comment = await CommentModel.findByIdAndUpdate(
    commentId,
    { $set: { status } },
    { new: true },
  );
  if (!comment) throw AppError.notFound("COMMENT_NOT_FOUND", "Comment not found");
  return comment.toObject() as Comment;
}
