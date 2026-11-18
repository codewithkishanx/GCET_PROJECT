import {
  ChallengeModel,
  SubmissionModel,
  WorkerHeartbeatModel,
  awardPointsOnce,
  connectMongo,
  createLogger,
  disconnectMongo,
  loadEnv,
  type Challenge,
  type Submission,
} from "@dsa/shared";
import { Worker, type Job } from "bullmq";
import IORedis from "ioredis";
import { loadWorkerConfig, type WorkerConfig } from "./config";
import { judgeSubmission, type JudgeResult } from "./judge/judge";
import { imageExists, isDockerAvailable, reapStaleContainers } from "./sandbox/docker";

const VERSION = "0.1.0";
const logger = createLogger("dsa-worker");

interface JobData {
  submissionId: string;
}

async function markRunning(submissionId: string): Promise<void> {
  await SubmissionModel.updateOne(
    { _id: submissionId, status: { $in: ["queued", "running"] } },
    { $set: { status: "running", startedAt: new Date() } },
  );
}

async function markSystemFailure(submissionId: string, message: string): Promise<void> {
  await SubmissionModel.updateOne(
    { _id: submissionId },
    {
      $set: {
        status: "failed",
        verdict: "SYSTEM_ERROR",
        message,
        completedAt: new Date(),
      },
    },
  );
}

async function completeWithResult(
  submission: Submission,
  challenge: Challenge,
  result: JudgeResult,
): Promise<void> {
  const update: Record<string, unknown> = {
    status: "completed",
    verdict: result.verdict,
    passedTests: result.passedTests,
    totalTests: result.totalTests,
    durationMs: result.durationMs,
    memoryKb: result.memoryKb,
    outputPreview: result.outputPreview,
    failedTest: result.failedTest ?? null,
    message: result.message,
    completedAt: new Date(),
  };

  if (result.verdict === "ACCEPTED") {
    // Idempotent: a duplicated delivery cannot award points twice.
    const award = await awardPointsOnce({
      userId: submission.userId,
      challengeId: challenge._id,
      submissionId: submission._id,
      points: challenge.points,
      policyVersion: challenge.rewardPolicyVersion,
      reason: "challenge_accepted",
    });
    if (award.awarded) {
      update.pointsAwarded = award.points;
      logger.info(
        { submissionId: String(submission._id), userId: String(submission.userId) },
        "points awarded",
      );
    }
  }

  await SubmissionModel.updateOne({ _id: submission._id }, { $set: update });
}

function createProcessor(config: WorkerConfig) {
  return async function processSubmission(job: Job<JobData>): Promise<void> {
    const { submissionId } = job.data;
    if (!submissionId) {
      logger.warn({ jobId: job.id }, "job payload without submissionId");
      return;
    }

    const submission = await SubmissionModel.findById(submissionId)
      .select("+sourceCode")
      .lean<Submission | null>();

    if (!submission) {
      logger.warn({ submissionId }, "submission no longer exists");
      return;
    }

    if (submission.status === "completed" && submission.verdict) {
      logger.info({ submissionId }, "submission already judged, skipping");
      return;
    }

    const challenge = await ChallengeModel.findById(submission.challengeId)
      .select("+hiddenTests +referenceSolutions")
      .lean<Challenge | null>();

    if (!challenge) {
      await markSystemFailure(submissionId, "Challenge no longer exists");
      return;
    }

    await markRunning(submissionId);

    if (!(await isDockerAvailable())) {
      // Infrastructure failure: let BullMQ retry, and fail the submission on the
      // final attempt.
      throw new Error("Docker daemon is not reachable from the execution worker");
    }

    const image = config.images[submission.language];
    if (!(await imageExists(image))) {
      await markSystemFailure(
        submissionId,
        `Execution image ${image} is missing. Run: npm run images:build`,
      );
      return;
    }

    const result = await judgeSubmission({
      language: submission.language,
      sourceCode: submission.sourceCode ?? "",
      tests: challenge.hiddenTests ?? [],
      timeLimitMs: challenge.timeLimitMs,
      memoryLimitMb: challenge.memoryLimitMb,
      outputLimitBytes: challenge.outputLimitBytes,
      config,
    });

    await completeWithResult(submission, challenge, result);
    logger.info(
      {
        submissionId,
        verdict: result.verdict,
        passed: result.passedTests,
        total: result.totalTests,
        durationMs: result.durationMs,
      },
      "submission judged",
    );
  };
}

async function main(): Promise<void> {
  loadEnv();
  const config = loadWorkerConfig();

  logger.info(
    { queue: config.queueName, concurrency: config.concurrency, env: config.nodeEnv },
    "starting execution worker",
  );

  await connectMongo(config.mongoUri);

  if (!(await isDockerAvailable())) {
    logger.error("Docker daemon is not available: submissions will fail until it is started");
  } else {
    for (const [language, image] of Object.entries(config.images)) {
      if (!(await imageExists(image))) {
        logger.warn(
          { language, image },
          "judge image missing; build it with: npm run images:build",
        );
      }
    }
  }

  const redisConnection = new IORedis(config.redisUrl, {
    maxRetriesPerRequest: null,
  });

  const worker = new Worker<JobData>(config.queueName, createProcessor(config), {
    connection: redisConnection,
    concurrency: config.concurrency,
    lockDuration: 120_000,
  });

  worker.on("failed", async (job, error) => {
    logger.error(
      { jobId: job?.id, attempt: job?.attemptsMade, err: error.message },
      "job failed",
    );
    if (!job?.data?.submissionId) return;
    const attempts = job.opts.attempts ?? 1;
    if ((job.attemptsMade ?? 0) >= attempts) {
      await markSystemFailure(
        job.data.submissionId,
        "The execution service could not process this submission",
      ).catch(() => undefined);
    }
  });

  worker.on("error", (error) => {
    logger.error({ err: error }, "worker error");
  });

  const heartbeat = async (): Promise<void> => {
    try {
      await WorkerHeartbeatModel.updateOne(
        { key: "worker" },
        { $set: { lastSeenAt: new Date(), concurrency: config.concurrency, version: VERSION } },
        { upsert: true },
      );
    } catch (error) {
      logger.warn({ err: error }, "heartbeat failed");
    }
  };

  await heartbeat();
  const heartbeatTimer = setInterval(() => void heartbeat(), 15_000);
  heartbeatTimer.unref();

  const reapTimer = setInterval(() => {
    void reapStaleContainers(config.maxContainerAgeMs)
      .then((removed) => {
        if (removed > 0) logger.warn({ removed }, "reaped stale judge containers");
      })
      .catch((error) => logger.warn({ err: error }, "container reaper failed"));
  }, 60_000);
  reapTimer.unref();

  const shutdown = async (signal: string): Promise<void> => {
    logger.info({ signal }, "shutting down worker");
    clearInterval(heartbeatTimer);
    clearInterval(reapTimer);
    try {
      await worker.close();
      await redisConnection.quit();
      await reapStaleContainers(0);
      await disconnectMongo();
    } catch (error) {
      logger.error({ err: error }, "error during worker shutdown");
    }
    process.exit(0);
  };

  process.on("SIGINT", () => void shutdown("SIGINT"));
  process.on("SIGTERM", () => void shutdown("SIGTERM"));

  logger.info("execution worker ready");
}

process.on("unhandledRejection", (reason) => {
  logger.error({ err: reason }, "unhandled promise rejection");
});

main().catch((error) => {
  logger.fatal({ err: error }, "worker failed to start");
  process.exit(1);
});
