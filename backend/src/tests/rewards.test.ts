import { describe, expect, it } from "vitest";
import mongoose from "mongoose";
import {
  RewardModel,
  UserModel,
  awardPointsOnce,
  reconcileUserPoints,
} from "@dsa/shared";

async function makeUser(username = "reward_user") {
  return UserModel.create({
    username,
    email: `${username}@example.com`,
    passwordHash: "not-a-real-hash",
  });
}

const challengeId = new mongoose.Types.ObjectId();
const submissionId = new mongoose.Types.ObjectId();

describe("reward idempotency", () => {
  it("awards points exactly once for repeated calls", async () => {
    const user = await makeUser();

    const first = await awardPointsOnce({
      userId: user._id,
      challengeId,
      submissionId,
      points: 75,
      policyVersion: 1,
    });
    const second = await awardPointsOnce({
      userId: user._id,
      challengeId,
      submissionId,
      points: 75,
      policyVersion: 1,
    });

    expect(first.awarded).toBe(true);
    expect(second.awarded).toBe(false);
    expect(second.alreadyAwarded).toBe(true);

    const reloaded = await UserModel.findById(user._id).lean();
    expect(reloaded?.points).toBe(75);
    expect(reloaded?.solvedCount).toBe(1);
    expect(await RewardModel.countDocuments()).toBe(1);
  });

  it("is safe under concurrent duplicate deliveries", async () => {
    const user = await makeUser("reward_concurrent");

    const results = await Promise.all(
      Array.from({ length: 5 }, () =>
        awardPointsOnce({
          userId: user._id,
          challengeId,
          submissionId,
          points: 100,
          policyVersion: 1,
        }),
      ),
    );

    expect(results.filter((result) => result.awarded)).toHaveLength(1);
    const reloaded = await UserModel.findById(user._id).lean();
    expect(reloaded?.points).toBe(100);
    expect(await RewardModel.countDocuments()).toBe(1);
  });

  it("allows a new reward when the policy version changes", async () => {
    const user = await makeUser("reward_v2");

    await awardPointsOnce({
      userId: user._id,
      challengeId,
      submissionId,
      points: 50,
      policyVersion: 1,
    });
    const upgraded = await awardPointsOnce({
      userId: user._id,
      challengeId,
      submissionId,
      points: 20,
      policyVersion: 2,
    });

    expect(upgraded.awarded).toBe(true);
    const reloaded = await UserModel.findById(user._id).lean();
    expect(reloaded?.points).toBe(70);
  });

  it("recomputes the cached totals from reward transactions", async () => {
    const user = await makeUser("reward_reconcile");
    await awardPointsOnce({
      userId: user._id,
      challengeId,
      submissionId,
      points: 40,
      policyVersion: 1,
    });

    // Simulate a corrupted cache (for example a crash between the reward insert
    // and the user update).
    await UserModel.updateOne({ _id: user._id }, { $set: { points: 9_999, solvedCount: 0 } });

    const result = await reconcileUserPoints(user._id);
    expect(result).toEqual({ points: 40, solvedCount: 1 });

    const reloaded = await UserModel.findById(user._id).lean();
    expect(reloaded?.points).toBe(40);
    expect(reloaded?.solvedCount).toBe(1);
  });
});
