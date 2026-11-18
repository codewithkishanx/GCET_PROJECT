import crypto from "node:crypto";
import { Types } from "mongoose";
import { isDuplicateKeyError } from "../model";
import { RewardModel } from "../models/reward.model";
import { UserModel } from "../models/user.model";

export interface AwardInput {
  userId: Types.ObjectId | string;
  challengeId: Types.ObjectId | string;
  submissionId: Types.ObjectId | string;
  points: number;
  policyVersion: number;
  reason?: string;
}

export interface AwardResult {
  awarded: boolean;
  alreadyAwarded: boolean;
  points: number;
}

/**
 * One reward per (user, challenge, policy version). The unique index on the
 * idempotency key is the concurrency guard, so duplicate or retried job
 * deliveries cannot double-award points.
 */
export function rewardIdempotencyKey(
  userId: Types.ObjectId | string,
  challengeId: Types.ObjectId | string,
  policyVersion: number,
): string {
  return crypto
    .createHash("sha256")
    .update(`${String(userId)}:${String(challengeId)}:v${policyVersion}`)
    .digest("hex");
}

export async function awardPointsOnce(input: AwardInput): Promise<AwardResult> {
  const idempotencyKey = rewardIdempotencyKey(
    input.userId,
    input.challengeId,
    input.policyVersion,
  );

  try {
    await RewardModel.create({
      userId: input.userId,
      challengeId: input.challengeId,
      submissionId: input.submissionId,
      points: input.points,
      reason: input.reason ?? "challenge_accepted",
      policyVersion: input.policyVersion,
      idempotencyKey,
    });
  } catch (error) {
    if (isDuplicateKeyError(error)) {
      return { awarded: false, alreadyAwarded: true, points: 0 };
    }
    throw error;
  }

  // The cache is advanced only after the auditable transaction exists. If this
  // update is interrupted, `npm run reconcile-points` recomputes the cache from
  // the reward transactions.
  await UserModel.updateOne(
    { _id: input.userId },
    { $inc: { points: input.points, solvedCount: 1 } },
  );

  return { awarded: true, alreadyAwarded: false, points: input.points };
}

/** Recomputes cached user totals from the auditable reward transactions. */
export async function reconcileUserPoints(
  userId: Types.ObjectId | string,
): Promise<{ points: number; solvedCount: number }> {
  const objectId = typeof userId === "string" ? new Types.ObjectId(userId) : userId;
  const rows = await RewardModel.aggregate<{ _id: null; points: number; solved: number }>([
    { $match: { userId: objectId } },
    { $group: { _id: null, points: { $sum: "$points" }, solved: { $sum: 1 } } },
  ]);
  const points = rows[0]?.points ?? 0;
  const solvedCount = rows[0]?.solved ?? 0;
  await UserModel.updateOne({ _id: userId }, { $set: { points, solvedCount } });
  return { points, solvedCount };
}
