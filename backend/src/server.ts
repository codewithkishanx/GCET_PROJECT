import { loadEnv } from "@dsa/shared";
import { createApp } from "./app";
import { loadConfig } from "./config/env";
import { logger } from "./lib/logger";
import { connectMongo, disconnectMongo } from "@dsa/shared";
import { createBullQueue } from "./queues/execution.queue";

async function main(): Promise<void> {
  const envPath = loadEnv();
  const config = loadConfig();

  logger.info(
    { env: config.nodeEnv, envFile: envPath ? "found" : "none", port: config.port },
    "starting DSA Arcade API",
  );

  await connectMongo(config.mongoUri);
  logger.info("connected to MongoDB");

  const queue = createBullQueue(config, logger);
  const app = createApp({ config, queue });

  const server = app.listen(config.port, () => {
    logger.info({ port: config.port }, "API listening");
  });

  let shuttingDown = false;
  const shutdown = async (signal: string): Promise<void> => {
    if (shuttingDown) return;
    shuttingDown = true;
    logger.info({ signal }, "shutting down");

    const forceExit = setTimeout(() => {
      logger.error("graceful shutdown timed out");
      process.exit(1);
    }, 10_000);
    forceExit.unref();

    server.close(async () => {
      try {
        await queue.close();
        await disconnectMongo();
      } catch (error) {
        logger.error({ err: error }, "error during shutdown");
      } finally {
        process.exit(0);
      }
    });
  };

  process.on("SIGINT", () => void shutdown("SIGINT"));
  process.on("SIGTERM", () => void shutdown("SIGTERM"));
}

process.on("unhandledRejection", (reason) => {
  logger.error({ err: reason }, "unhandled promise rejection");
});

process.on("uncaughtException", (error) => {
  logger.fatal({ err: error }, "uncaught exception, exiting");
  process.exit(1);
});

main().catch((error) => {
  logger.fatal({ err: error }, "failed to start API");
  process.exit(1);
});
