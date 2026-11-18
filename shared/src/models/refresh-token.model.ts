import { Schema, type Types } from "mongoose";
import { getModel } from "../model";

/**
 * One document per issued refresh token ("session"). Tokens are rotated on every
 * refresh; presenting a rotated token revokes the whole chain (reuse detection).
 */
export interface RefreshToken {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  jti: string;
  tokenHash?: string;
  expiresAt: Date;
  revokedAt?: Date | null;
  replacedByJti?: string | null;
  userAgent?: string | null;
  ip?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

const refreshTokenSchema = new Schema<RefreshToken>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    jti: { type: String, required: true, unique: true },
    tokenHash: { type: String, required: true, select: false },
    expiresAt: { type: Date, required: true },
    revokedAt: { type: Date, default: null },
    replacedByJti: { type: String, default: null },
    userAgent: { type: String, maxlength: 300, default: null },
    ip: { type: String, maxlength: 64, default: null },
  },
  { timestamps: true },
);

// MongoDB TTL index: expired sessions are cleaned up automatically.
refreshTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
refreshTokenSchema.index({ userId: 1, revokedAt: 1 });

export const RefreshTokenModel = getModel<RefreshToken>("RefreshToken", refreshTokenSchema);
