/**
 * Creates or promotes an administrator from trusted environment variables.
 * Public registration can never assign the admin role.
 *
 * Run: npm run create-admin
 */
import { loadEnv, connectMongo, disconnectMongo, UserModel } from "@dsa/shared";
import { createLogger } from "@dsa/shared";
import { normalizeEmail, normalizeUsername } from "../utils/normalize";
import { hashPassword } from "../utils/password";

const logger = createLogger("create-admin");

async function main(): Promise<void> {
  loadEnv();

  const username = process.env.ADMIN_USERNAME?.trim();
  const email = process.env.ADMIN_EMAIL?.trim();
  const password = process.env.ADMIN_PASSWORD ?? "";

  if (!username || !email) {
    throw new Error("ADMIN_USERNAME and ADMIN_EMAIL must be set");
  }
  if (password.length < 10) {
    throw new Error("ADMIN_PASSWORD must be at least 10 characters");
  }

  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) throw new Error("MONGODB_URI must be set");

  await connectMongo(mongoUri);

  const normalizedUsername = normalizeUsername(username);
  const normalizedEmail = normalizeEmail(email);
  const passwordHash = await hashPassword(password);

  const existing = await UserModel.findOne({
    $or: [{ username: normalizedUsername }, { email: normalizedEmail }],
  });

  if (existing) {
    existing.role = "admin";
    existing.status = "active";
    existing.passwordHash = passwordHash;
    await existing.save();
    logger.info({ username: existing.username }, "existing account promoted to admin");
  } else {
    await UserModel.create({
      username: normalizedUsername,
      email: normalizedEmail,
      passwordHash,
      role: "admin",
      status: "active",
    });
    logger.info({ username: normalizedUsername }, "admin account created");
  }

  await disconnectMongo();
}

main().catch((error) => {
  logger.error({ err: error }, "create-admin failed");
  process.exit(1);
});
