import { Schema, type Types } from "mongoose";
import { POST_STATUSES, type PostStatus } from "../enums";
import { getModel } from "../model";

export interface Post {
  _id: Types.ObjectId;
  authorId: Types.ObjectId;
  title: string;
  slug: string;
  summary: string;
  contentMarkdown: string;
  tags: string[];
  status: PostStatus;
  likeCount: number;
  commentCount: number;
  editCount: number;
  isDemo: boolean;
  publishedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const postSchema = new Schema<Post>(
  {
    authorId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    title: { type: String, required: true, trim: true, maxlength: 160 },
    slug: { type: String, required: true, unique: true, trim: true, lowercase: true, maxlength: 190 },
    summary: { type: String, trim: true, maxlength: 400, default: "" },
    contentMarkdown: { type: String, required: true, maxlength: 60_000 },
    tags: { type: [String], default: [], index: true },
    status: { type: String, enum: POST_STATUSES, default: "draft", required: true, index: true },
    likeCount: { type: Number, default: 0, min: 0, required: true },
    commentCount: { type: Number, default: 0, min: 0, required: true },
    editCount: { type: Number, default: 0, min: 0, required: true },
    isDemo: { type: Boolean, default: false, required: true },
    publishedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

postSchema.index({ status: 1, publishedAt: -1 });
postSchema.index({ title: "text", summary: "text", tags: "text" });

export const PostModel = getModel<Post>("Post", postSchema);
