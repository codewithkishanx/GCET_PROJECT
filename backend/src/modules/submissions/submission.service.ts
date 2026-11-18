import mongoose from "mongoose";
import {
  ChallengeModel,
  SubmissionModel,
  type Challenge,
  type Submission,
  type User,
} from "@dsa/shared";
import type { AppConfig } from "../../config/env";
import type { ExecutionQueue } from "../../queues/execution.queue";
import { AppError } from "../../utils/errors";
import { byteLength } from "../../utils/normalize";
import type { CreateSubmissionInput } from "./submission.validator";

export interface SubmissionServiceDeps {
  config: AppConfig;
  queue: ExecutionQueue;
}

export interface SubmissionWithChallenge {
  submission: Submission;
  challenge: Pick<Challenge, "_id" | "title" | "slug" | "points" | "difficulty" | "topic">;
}

export async function createSubmission(
  userId: string,
  challengeId: string,
  input: CreateSubmissionInput,
  deps: SubmissionServiceDeps,
): Promise<Submission> {
  if (!mongoose.isValidObjectId(challengeId)) {
    throw AppError.notFound("CHALLENGE_NOT_FOUND", "Challenge not found");
  }

  const challenge = await ChallengeModel.findOne({
    _id: challengeId,
    status: "published",
  }).lean<Challenge | null>();

  if (!challenge) throw AppError.notFound("CHALLENGE_NOT_FOUND", "Challenge not found");

  if (!challenge.supportedLanguages.includes(input.language)) {
    throw AppError.badRequest(
      "UNSUPPORTED_LANGUAGE",
      `This challenge does not accept ${input.language} submissions`,
    );
  }

  if (byteLength(input.sourceCode) > deps.config.maxSourceBytes) {
    throw AppError.payloadTooLarge(
      `Source code exceeds the ${deps.config.maxSourceBytes} byte limit`,
    );
  }

  if (byteLength(input.sourceCode.trim()) === 0) {
    throw AppError.badRequest("EMPTY_SOURCE", "Source code is required");
  }

  // Bounded per-user queue depth: a user cannot flood the worker.
  const inFlight = await SubmissionModel.countDocuments({
    userId,
    status: { $in: ["queued", "running"] },
  });
  if (inFlight >= deps.config.maxActiveSubmissions) {
    throw new AppError(
      429,
      "SUBMISSION_QUOTA",
      `You already have ${inFlight} submissions in progress. Wait for them to finish.`,
    );
  }

  const submission = await SubmissionModel.create({
    userId,
    challengeId: challenge._id,
    language: input.language,
    sourceCode: input.sourceCode,
    status: "queued",
  });

  try {
    const jobId = await deps.queue.enqueue(String(submission._id));
    if (jobId) {
      await SubmissionModel.updateOne({ _id: submission._id }, { $set: { jobId } });
      submission.jobId = jobId;
    }
  } catch {
    // Never leave a submission silently queued when the queue is down.
    await SubmissionModel.updateOne(
      { _id: submission._id },
      {
        $set: {
          status: "failed",
          verdict: "SYSTEM_ERROR",
          message: "Execution service unavailable",
          completedAt: new Date(),
        },
      },
    );
    throw AppError.serviceUnavailable(
      "EXECUTION_UNAVAILABLE",
      "The execution service is unavailable. Please try again shortly.",
    );
  }

  return submission;
}

export async function getSubmissionForViewer(
  submissionId: string,
  viewer: User,
): Promise<SubmissionWithChallenge> {
  if (!mongoose.isValidObjectId(submissionId)) {
    throw AppError.notFound("SUBMISSION_NOT_FOUND", "Submission not found");
  }

  const submission = await SubmissionModel.findById(submissionId)
    .select("+sourceCode")
    .lean<Submission | null>();

  if (!submission) throw AppError.notFound("SUBMISSION_NOT_FOUND", "Submission not found");

  // Object-level authorization: another user's submission is indistinguishable
  // from a missing one.
  const isOwner = String(submission.userId) === String(viewer._id);
  if (!isOwner && viewer.role !== "admin") {
    throw AppError.notFound("SUBMISSION_NOT_FOUND", "Submission not found");
  }

  const challenge = await ChallengeModel.findById(submission.challengeId)
    .select("title slug points difficulty topic")
    .lean<Challenge | null>();

  if (!challenge) throw AppError.notFound("CHALLENGE_NOT_FOUND", "Challenge not found");

  return {
    submission,
    challenge: {
      _id: challenge._id,
      title: challenge.title,
      slug: challenge.slug,
      points: challenge.points,
      difficulty: challenge.difficulty,
      topic: challenge.topic,
    },
  };
}
