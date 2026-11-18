import { SubmissionModel, UserModel, type User } from "@dsa/shared";
import { AppError } from "../../utils/errors";
import { normalizeUsername } from "../../utils/normalize";
import { toSkipLimit, type PaginationInput } from "../../utils/pagination";
import { rankFor } from "../leaderboard/leaderboard.service";
import type { UpdateProfileInput } from "./users.validator";

/**
 * Only profile fields are writable. role, points, status, email and password are
 * intentionally absent, and the request validator is strict, so attempts to send
 * them are rejected rather than silently ignored.
 */
export async function updateProfile(userId: string, input: UpdateProfileInput): Promise<User> {
  const update: Record<string, unknown> = {};

  if (input.displayName !== undefined) {
    update.displayName = input.displayName?.trim() ? input.displayName.trim() : null;
  }
  if (input.bio !== undefined) {
    update.bio = input.bio?.trim() ? input.bio.trim() : null;
  }
  if (input.avatarUrl !== undefined) {
    update.avatarUrl = input.avatarUrl?.trim() ? input.avatarUrl.trim() : null;
  }

  const user = await UserModel.findByIdAndUpdate(
    userId,
    { $set: update },
    { new: true, runValidators: true },
  ).lean<User | null>();

  if (!user) throw AppError.notFound("USER_NOT_FOUND", "User not found");
  return user;
}

export async function findByUsername(username: string): Promise<User | null> {
  return UserModel.findOne({ username: normalizeUsername(username) }).lean<User | null>();
}

export async function userStats(user: User): Promise<{
  points: number;
  solvedCount: number;
  rank: number;
  acceptedByDifficulty: Record<string, number>;
}> {
  const [rank, byDifficulty] = await Promise.all([
    rankFor(user),
    SubmissionModel.aggregate<{ _id: string; count: number }>([
      { $match: { userId: user._id, verdict: "ACCEPTED" } },
      { $group: { _id: "$challengeId" } },
      {
        $lookup: {
          from: "challenges",
          localField: "_id",
          foreignField: "_id",
          as: "challenge",
        },
      },
      { $unwind: "$challenge" },
      { $group: { _id: "$challenge.difficulty", count: { $sum: 1 } } },
    ]),
  ]);

  const acceptedByDifficulty: Record<string, number> = {};
  for (const row of byDifficulty) {
    acceptedByDifficulty[row._id] = row.count;
  }

  return {
    points: user.points,
    solvedCount: user.solvedCount,
    rank,
    acceptedByDifficulty,
  };
}

export async function listMySubmissions(
  userId: string,
  input: PaginationInput & { challengeId?: string },
): Promise<{ items: unknown[]; total: number; input: PaginationInput }> {
  const filter: Record<string, unknown> = { userId };
  if (input.challengeId) filter.challengeId = input.challengeId;

  const { skip, limit } = toSkipLimit(input);
  const [items, total] = await Promise.all([
    SubmissionModel.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    SubmissionModel.countDocuments(filter),
  ]);

  return { items, total, input };
}
