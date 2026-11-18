import type { Request, Response } from "express";
import { AppError } from "../../utils/errors";
import { validated } from "../../middleware/validate";
import { toSubmissionView } from "../../utils/serializers";
import type { SubmissionServiceDeps } from "./submission.service";
import { createSubmission, getSubmissionForViewer } from "./submission.service";
import type { CreateSubmissionInput } from "./submission.validator";

export function createSubmissionController(deps: SubmissionServiceDeps) {
  return {
    create: async (req: Request, res: Response): Promise<void> => {
      if (!req.user) throw AppError.unauthorized();
      const input = validated<CreateSubmissionInput>(req, "body");
      const challengeId = String(req.params.challengeId ?? "");

      const submission = await createSubmission(
        String(req.user._id),
        challengeId,
        input,
        deps,
      );

      const view = toSubmissionView(submission);
      res.status(202).json({
        ...view,
        submission: view,
        pollUrl: `/api/v1/submissions/${String(submission._id)}`,
      });
    },

    detail: async (req: Request, res: Response): Promise<void> => {
      if (!req.user) throw AppError.unauthorized();
      const { submission, challenge } = await getSubmissionForViewer(
        String(req.params.submissionId ?? ""),
        req.user,
      );

      const isOwner = String(submission.userId) === String(req.user._id);
      const view = toSubmissionView(submission, { includeSource: isOwner });
      res.status(200).json({
        ...view,
        submission: view,
        challenge: {
          id: String(challenge._id),
          title: challenge.title,
          slug: challenge.slug,
          topic: challenge.topic,
          difficulty: challenge.difficulty,
          points: challenge.points,
        },
      });
    },
  };
}
