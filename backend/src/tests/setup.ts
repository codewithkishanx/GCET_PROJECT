import mongoose from "mongoose";
import { afterAll, beforeAll, beforeEach } from "vitest";
import {
  AuditLogModel,
  ChallengeModel,
  CommentModel,
  LikeModel,
  PostModel,
  RefreshTokenModel,
  ReportModel,
  RewardModel,
  SubmissionModel,
  TopicModel,
  UserModel,
  WorkerHeartbeatModel,
  connectMongo,
  disconnectMongo,
  loadEnv,
} from "@dsa/shared";

process.env.NODE_ENV = "test";
// Keep the test output readable: the error boundary still returns structured
// responses, it just does not print a log line for every rejected request.
process.env.LOG_LEVEL = "silent";
loadEnv();

const uri =
  process.env.MONGODB_URI_TEST?.trim() || "mongodb://127.0.0.1:27017/dsa_arcade_test";

if (!/\/[a-z0-9_]*_test(\?|$)/i.test(uri)) {
  throw new Error(
    `Refusing to run tests against a non-test database: ${uri}. ` +
      "MONGODB_URI_TEST must end with _test.",
  );
}

// Deterministic test configuration, independent of the developer's .env.
process.env.MONGODB_URI = uri;
process.env.JWT_ACCESS_SECRET = "test-only-access-secret-value-0123456789";
process.env.JWT_REFRESH_SECRET = "test-only-refresh-secret-value-0123456789";
process.env.ACCESS_TOKEN_TTL_MIN = "15";
process.env.REFRESH_TOKEN_TTL_DAYS = "7";
process.env.COOKIE_SECURE = "false";
process.env.CLIENT_ORIGIN = "http://localhost:5173";
process.env.REDIS_URL = process.env.REDIS_URL ?? "redis://127.0.0.1:6379";

const models = [
  UserModel,
  RefreshTokenModel,
  TopicModel,
  ChallengeModel,
  SubmissionModel,
  RewardModel,
  PostModel,
  CommentModel,
  LikeModel,
  ReportModel,
  AuditLogModel,
  WorkerHeartbeatModel,
];

beforeAll(async () => {
  await connectMongo(uri);
  const db = mongoose.connection.db;
  if (!db) throw new Error("MongoDB connection has no database handle");
  await db.dropDatabase();
  await Promise.all(models.map((model) => model.init()));
});

beforeEach(async () => {
  const db = mongoose.connection.db;
  if (!db) throw new Error("MongoDB connection has no database handle");
  const collections = await db.collections();
  await Promise.all(collections.map((collection) => collection.deleteMany({})));
});

afterAll(async () => {
  const db = mongoose.connection.db;
  if (db) await db.dropDatabase();
  await disconnectMongo();
});
