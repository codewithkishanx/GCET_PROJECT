import { Schema, type Types } from "mongoose";
import { COMMENT_STATUSES, type CommentStatus } from "../enums";
import { getModel } from "../model";

export interface Comment {
  _id: Types.ObjectId;
  postId: Types.ObjectId;
  authorId: Types.ObjectId;
  body: string;
  status: CommentStatus;
  createdAt: Date;
  updatedAt: Date;
}

const commentSchema = new Schema<Comment>(
  {
    postId: { type: Schema.Types.ObjectId, ref: "Post", required: true, index: true },
    authorId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    body: { type: String, required: true, trim: true, maxlength: 2_000 },
    status: { type: String, enum: COMMENT_STATUSES, default: "visible", required: true },
  },
  { timestamps: true },
);

commentSchema.index({ postId: 1, createdAt: -1 });

export const CommentModel = getModel<Comment>("Comment", commentSchema);
