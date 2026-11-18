import { Router } from "express";
import { paginationSchema, paginationMeta } from "../../utils/pagination";
import { validated } from "../../middleware/validate";
import { validate } from "../../middleware/validate";
import type { PaginationInput } from "../../utils/pagination";
import { listLeaderboard } from "./leaderboard.service";

export function createLeaderboardRouter(): Router {
  const router = Router();

  router.get("/", validate({ query: paginationSchema }), async (req, res) => {
    const input = validated<PaginationInput>(req, "query");
    const { entries, total } = await listLeaderboard(input);
    const meta = paginationMeta(total, input);
    const nextCursor = meta.page < meta.pages ? String(meta.page + 1) : null;
    res.status(200).json({
      items: entries,
      nextCursor,
      entries,
      pagination: meta,
    });
  });

  return router;
}
