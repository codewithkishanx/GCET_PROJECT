import { Router } from "express";
import { WorkerHeartbeatModel, pingMongo } from "@dsa/shared";
import type { ExecutionQueue } from "../../queues/execution.queue";

/**
 * Liveness/readiness probe. Only booleans and queue depth are exposed; no
 * connection strings, hostnames or internal error details.
 */
export function createHealthRouter(queue: ExecutionQueue): Router {
  const router = Router();

  router.get("/", async (_req, res) => {
    const [databaseOk, counts, heartbeat] = await Promise.all([
      pingMongo(),
      queue.counts(),
      WorkerHeartbeatModel.findOne({ key: "worker" })
        .select("lastSeenAt")
        .lean()
        .catch(() => null),
    ]);

    const queueOk = counts !== null;
    const workerLastSeen = heartbeat?.lastSeenAt ? new Date(heartbeat.lastSeenAt).getTime() : null;
    const workerOnline = workerLastSeen !== null && Date.now() - workerLastSeen < 60_000;
    const healthy = databaseOk && queueOk;

    res.status(healthy ? 200 : 503).json({
      status: healthy ? "ok" : "degraded",
      time: new Date().toISOString(),
      checks: {
        database: databaseOk ? "ok" : "down",
        queue: queueOk ? "ok" : "down",
        worker: workerOnline ? "online" : "offline",
      },
      queue: counts,
    });
  });

  return router;
}
