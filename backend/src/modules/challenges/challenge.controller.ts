import type { Request, Response } from "express";
import type { Challenge } from "@dsa/shared";
import { validated } from "../../middleware/validate";
import { paginationMeta } from "../../utils/pagination";
import { toPublicChallenge } from "../../utils/serializers";
import { getPublicChallengeBySlug, listPublicChallenges } from "./challenge.service";
import type { ChallengeListInput } from "./challenge.validator";

export const challengesController = {
  list: async (req: Request, res: Response): Promise<void> => {
    const input = validated<ChallengeListInput>(req, "query");
    const { items, total } = await listPublicChallenges(input);
    const publicChallenges = items.map((item) => toPublicChallenge(item as Challenge));
    const meta = paginationMeta(total, input);
    const nextCursor = meta.page < meta.pages ? String(meta.page + 1) : null;
    res.status(200).json({
      items: publicChallenges,
      nextCursor,
      challenges: publicChallenges,
      pagination: meta,
    });
  },

  detail: async (req: Request, res: Response): Promise<void> => {
    const challenge = await getPublicChallengeBySlug(String(req.params.slug ?? ""));
    const publicChallenge = toPublicChallenge(challenge);
    res.status(200).json({
      ...publicChallenge,
      challenge: publicChallenge,
    });
  },
};
