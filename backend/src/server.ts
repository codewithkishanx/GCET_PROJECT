import { spawn, type ChildProcess } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
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

  // Automatically start the execution worker alongside the API so submissions are never stuck
  let workerChild: ChildProcess | null = null;
  const workerDist = path.resolve(__dirname, "../../execution-worker/dist/worker.js");
  if (fs.existsSync(workerDist) && process.env.SPAWN_WORKER !== "false") {
    logger.info({ path: workerDist }, "spawning integrated execution worker");
    workerChild = spawn("node", [workerDist], {
      stdio: "inherit",
      cwd: path.dirname(workerDist),
    });
    workerChild.on("error", (err) => {
      logger.warn({ err }, "failed to spawn integrated execution worker");
    });
    workerChild.on("exit", (code) => {
      if (!shuttingDown) {
        logger.warn({ code }, "integrated execution worker exited");
      }
    });
  }

  let shuttingDown = false;
  const shutdown = async (signal: string): Promise<void> => {
    if (shuttingDown) return;
    shuttingDown = true;
    logger.info({ signal }, "shutting down");

    if (workerChild) {
      try {
        workerChild.kill("SIGTERM");
      } catch {
        // ignore
      }
    }

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
