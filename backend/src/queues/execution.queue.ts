import { Queue } from "bullmq";
import IORedis from "ioredis";
import type { Logger } from "pino";
import type { AppConfig } from "../config/env";

export interface QueueCounts {
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
  paused: number;
}

export interface ExecutionQueue {
  enqueue(submissionId: string): Promise<string | null>;
  counts(): Promise<QueueCounts | null>;
  close(): Promise<void>;
}

/**
 * Producer side of the execution queue. Only the submission id travels through
 * Redis; source code is read from MongoDB by the worker.
 */
export function createBullQueue(config: AppConfig, logger: Logger): ExecutionQueue {
  const connection = new IORedis(config.redisUrl, { maxRetriesPerRequest: null });
  const queue = new Queue(config.queueName, {
    connection,
    defaultJobOptions: {
      attempts: 2,
      backoff: { type: "exponential", delay: 2_000 },
      removeOnComplete: { age: 3_600, count: 1_000 },
      removeOnFail: { age: 86_400, count: 1_000 },
    },
  });

  queue.on("error", (error: Error) => {
    logger.error({ err: error }, "execution queue error");
  });

  return {
    async enqueue(submissionId: string): Promise<string | null> {
      // A deterministic job id makes duplicate enqueues a no-op while the job
      // exists, on top of the reward idempotency key.
      const job = await queue.add(
        "judge",
        { submissionId },
        { jobId: submissionId },
      );
      return job.id ?? null;
    },

    async counts(): Promise<QueueCounts | null> {
      try {
        const raw = await queue.getJobCounts();
        return {
          waiting: raw.waiting ?? 0,
          active: raw.active ?? 0,
          completed: raw.completed ?? 0,
          failed: raw.failed ?? 0,
          delayed: raw.delayed ?? 0,
          paused: raw.paused ?? 0,
        };
      } catch (error) {
        logger.warn({ err: error }, "could not read queue counts");
        return null;
      }
    },

    async close(): Promise<void> {
      await queue.close();
      await connection.quit();
    },
  };
}

/** Deterministic stand-in used by tests: records jobs without touching Redis. */
export function createInMemoryQueue(): ExecutionQueue & { jobs: string[] } {
  const jobs: string[] = [];
  return {
    jobs,
    async enqueue(submissionId: string): Promise<string> {
      jobs.push(submissionId);
      return submissionId;
    },
    async counts(): Promise<QueueCounts> {
      return {
        waiting: jobs.length,
        active: 0,
        completed: 0,
        failed: 0,
        delayed: 0,
        paused: 0,
      };
    },
    async close(): Promise<void> {
      // nothing to close
    },
  };
}
