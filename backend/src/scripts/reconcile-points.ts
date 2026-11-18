/**
 * Recomputes cached user points from the auditable reward transactions.
 * Safe to run at any time; writes are idempotent.
 *
 * Run: npm run reconcile-points
 */
import {
  UserModel,
  connectMongo,
  createLogger,
  disconnectMongo,
  loadEnv,
  reconcileUserPoints,
} from "@dsa/shared";

const logger = createLogger("reconcile-points");

async function main(): Promise<void> {
  loadEnv();
  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) throw new Error("MONGODB_URI must be set");

  await connectMongo(mongoUri);

  const users = await UserModel.find().select("_id username").lean();
  let updated = 0;

  for (const user of users) {
    const result = await reconcileUserPoints(user._id);
    await UserModel.updateOne(
      { _id: user._id },
      { $set: { points: result.points, solvedCount: result.solvedCount } },
    );
    updated += 1;
  }

  logger.info({ users: updated }, "points reconciled from reward transactions");
  await disconnectMongo();
}

main().catch((error) => {
  logger.error({ err: error }, "reconcile-points failed");
  process.exit(1);
});
