import type { Request, Response } from "express";
import { AppError } from "../../utils/errors";
import { renderMarkdown } from "../../utils/markdown";
import { paginationMeta, toSkipLimit } from "../../utils/pagination";
import { toCommentView, toPostView } from "../../utils/serializers";
import { validated } from "../../middleware/validate";
import {
  addComment,
  authorFor,
  authorsFor,
  createPost,
  createReport,
  getPostBySlug,
  listComments,
  listPosts,
  removePost,
  setLike,
  updatePost,
} from "./post.service";
import type {
  CommentCreateInput,
  CreatePostInput,
  PostListInput,
  ReportCreateInput,
  UpdatePostInput,
} from "./post.validator";
import { z } from "zod";
import { paginationSchema } from "../../utils/pagination";

export const postsController = {
  list: async (req: Request, res: Response): Promise<void> => {
    const input = validated<PostListInput>(req, "query");
    const { items, total } = await listPosts(input);
    const authors = await authorsFor(items.map((post) => String(post.authorId)));
    const mapped = items.map((post) => toPostView(post, authors.get(String(post.authorId)) ?? null));
    const meta = paginationMeta(total, input);
    const nextCursor = meta.page < meta.pages ? String(meta.page + 1) : null;

    res.status(200).json({
      items: mapped,
      nextCursor,
      posts: mapped,
      pagination: meta,
    });
  },

  detail: async (req: Request, res: Response): Promise<void> => {
    const post = await getPostBySlug(String(req.params.slug ?? ""), req.user);
    const author = await authorFor(post.authorId);
    const view = toPostView(post, author, {
      includeContent: true,
      contentHtml: renderMarkdown(post.contentMarkdown),
    });

    res.status(200).json({
      ...view,
      post: view,
    });
  },

  create: async (req: Request, res: Response): Promise<void> => {
    if (!req.user) throw AppError.unauthorized();
    const input = validated<CreatePostInput>(req, "body");
    const post = await createPost(String(req.user._id), input);
    const author = await authorFor(post.authorId);
    const view = toPostView(post, author, { includeContent: true });
    res.status(201).json({
      ...view,
      post: view,
    });
  },

  update: async (req: Request, res: Response): Promise<void> => {
    if (!req.user) throw AppError.unauthorized();
    const input = validated<UpdatePostInput>(req, "body");
    const post = await updatePost(String(req.params.postId ?? ""), req.user, input);
    const author = await authorFor(post.authorId);
    res.status(200).json({
      post: toPostView(post, author, { includeContent: true }),
    });
  },

  remove: async (req: Request, res: Response): Promise<void> => {
    if (!req.user) throw AppError.unauthorized();
    await removePost(String(req.params.postId ?? ""), req.user);
    res.status(204).send();
  },

  like: async (req: Request, res: Response): Promise<void> => {
    if (!req.user) throw AppError.unauthorized();
    const result = await setLike(
      String(req.params.postId ?? ""),
      String(req.user._id),
      true,
    );
    res.status(200).json(result);
  },

  unlike: async (req: Request, res: Response): Promise<void> => {
    if (!req.user) throw AppError.unauthorized();
    const result = await setLike(
      String(req.params.postId ?? ""),
      String(req.user._id),
      false,
    );
    res.status(200).json(result);
  },

  listComments: async (req: Request, res: Response): Promise<void> => {
    const page = validated<{ page: number; limit: number }>(req, "query");
    const { items, total } = await listComments(
      String(req.params.postId ?? ""),
      toSkipLimit(page),
    );
    const authors = await authorsFor(items.map((comment) => String(comment.authorId)));

    const mapped = items.map((comment) =>
      toCommentView(comment, authors.get(String(comment.authorId)) ?? null),
    );
    const meta = paginationMeta(total, page);
    const nextCursor = meta.page < meta.pages ? String(meta.page + 1) : null;

    res.status(200).json({
      items: mapped,
      nextCursor,
      comments: mapped,
      pagination: meta,
    });
  },

  createComment: async (req: Request, res: Response): Promise<void> => {
    if (!req.user) throw AppError.unauthorized();
    const input = validated<CommentCreateInput>(req, "body");
    const comment = await addComment(
      String(req.params.postId ?? ""),
      String(req.user._id),
      input,
    );
    const author = await authorFor(comment.authorId);
    res.status(201).json({ comment: toCommentView(comment, author) });
  },

  report: async (req: Request, res: Response): Promise<void> => {
    if (!req.user) throw AppError.unauthorized();
    const input = validated<ReportCreateInput>(req, "body");
    const report = await createReport(String(req.user._id), input);
    res.status(201).json({ report: { id: report.id, status: "open" } });
  },
};

export const commentQuerySchema = paginationSchema;
export type CommentQuery = z.infer<typeof commentQuerySchema>;
