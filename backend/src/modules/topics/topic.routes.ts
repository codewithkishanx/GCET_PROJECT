import { Router } from "express";
import { getTopic, listTopics } from "./topic.service";

export function createTopicsRouter(): Router {
  const router = Router();

  router.get("/", async (_req, res) => {
    res.status(200).json({ topics: await listTopics() });
  });

  router.get("/:slug", async (req, res) => {
    res.status(200).json({ topic: await getTopic(String(req.params.slug ?? "")) });
  });

  return router;
}
