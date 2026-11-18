import { UserModel } from "@dsa/shared";
import { toSkipLimit, type PaginationInput } from "../../utils/pagination";

export interface LeaderboardEntry {
  rank: number;
  id: string;
  username: string;
  displayName: string | null;
  points: number;
  solvedCount: number;
}

/**
 * Deterministic ordering: points desc, then username asc. The tie-breaker is
 * documented in the README so ranks never shift between requests.
 */
export async function rankFor(user: { points: number; username: string }): Promise<number> {
  const ahead = await UserModel.countDocuments({
    status: "active",
    $or: [
      { points: { $gt: user.points } },
      { points: user.points, username: { $lt: user.username } },
    ],
  });
  return ahead + 1;
}

export async function listLeaderboard(input: PaginationInput): Promise<{
  entries: LeaderboardEntry[];
  total: number;
}> {
  const { skip, limit } = toSkipLimit(input);
  const filter = { status: "active" as const };

  const [total, users] = await Promise.all([
    UserModel.countDocuments(filter),
    UserModel.find(filter)
      .sort({ points: -1, username: 1 })
      .skip(skip)
      .limit(limit)
      .lean(),
  ]);

  return {
    total,
    entries: users.map((user, index) => ({
      rank: skip + index + 1,
      id: String(user._id),
      username: user.username,
      displayName: user.displayName ?? null,
      points: user.points,
      solvedCount: user.solvedCount,
    })),
  };
}
