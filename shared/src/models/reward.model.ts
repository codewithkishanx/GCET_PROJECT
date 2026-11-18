import { Schema, type Types } from "mongoose";
import { getModel } from "../model";

/**
 * Auditable source of truth for points. `idempotencyKey` is unique, so a
 * duplicated job delivery can never award the same reward twice.
 */
export interface RewardTransaction {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  challengeId: Types.ObjectId;
  submissionId: Types.ObjectId;
  points: number;
  reason: string;
  policyVersion: number;
  idempotencyKey: string;
  createdAt: Date;
  updatedAt: Date;
}

const rewardSchema = new Schema<RewardTransaction>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    challengeId: { type: Schema.Types.ObjectId, ref: "Challenge", required: true },
    submissionId: { type: Schema.Types.ObjectId, ref: "Submission", required: true },
    points: { type: Number, required: true, min: 0 },
    reason: { type: String, required: true, maxlength: 200 },
    policyVersion: { type: Number, required: true, min: 1 },
    idempotencyKey: { type: String, required: true, unique: true, maxlength: 128 },
  },
  { timestamps: true },
);

rewardSchema.index({ userId: 1, createdAt: -1 });
rewardSchema.index({ challengeId: 1 });

export const RewardModel = getModel<RewardTransaction>("Reward", rewardSchema);
