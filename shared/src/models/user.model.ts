import { Schema, type Types } from "mongoose";
import { ROLES, USER_STATUSES, type Role, type UserStatus } from "../enums";
import { getModel } from "../model";

export interface User {
  _id: Types.ObjectId;
  username: string;
  email: string;
  passwordHash?: string;
  role: Role;
  status: UserStatus;
  displayName?: string | null;
  avatarUrl?: string | null;
  bio?: string | null;
  points: number;
  solvedCount: number;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<User>(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      minlength: 3,
      maxlength: 24,
      match: /^[a-z0-9_]+$/,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      maxlength: 254,
    },
    passwordHash: { type: String, required: true, select: false },
    role: { type: String, enum: ROLES, default: "user", required: true },
    status: { type: String, enum: USER_STATUSES, default: "active", required: true },
    displayName: { type: String, trim: true, maxlength: 60, default: null },
    avatarUrl: { type: String, trim: true, maxlength: 500, default: null },
    bio: { type: String, trim: true, maxlength: 500, default: null },
    // Cached aggregate. The rewards collection is the auditable source of truth.
    points: { type: Number, default: 0, min: 0, required: true },
    solvedCount: { type: Number, default: 0, min: 0, required: true },
  },
  { timestamps: true },
);

userSchema.index({ points: -1, username: 1 });
userSchema.index({ status: 1 });

export const UserModel = getModel<User>("User", userSchema);
