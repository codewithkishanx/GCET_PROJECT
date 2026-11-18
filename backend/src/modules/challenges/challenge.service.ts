import { ChallengeModel, type Challenge, type Language } from "@dsa/shared";
import { AppError } from "../../utils/errors";
import { escapeRegex } from "../../utils/pagination";
import { generateUniqueSlug, slugify } from "../../utils/slug";
import type {
  AdminChallengeListInput,
  ChallengeListInput,
  CreateChallengeInput,
  UpdateChallengeInput,
} from "./challenge.validator";

async function slugExists(slug: string): Promise<boolean> {
  return (await ChallengeModel.exists({ slug })) !== null;
}

export async function listPublicChallenges(
  input: ChallengeListInput,
): Promise<{ items: Challenge[]; total: number }> {
  const filter: Record<string, unknown> = { status: "published" };

  if (input.topic && input.topic !== "all") filter.topic = input.topic.toLowerCase();
  if (input.difficulty) filter.difficulty = input.difficulty;
  if (input.language) filter.supportedLanguages = input.language;
  if (input.q) {
    const pattern = new RegExp(escapeRegex(input.q), "i");
    filter.$or = [{ title: pattern }, { topic: pattern }];
  }

  const skip = (input.page - 1) * input.limit;
  const [items, total] = await Promise.all([
    ChallengeModel.find(filter)
      .select("-hiddenTests -referenceSolutions")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(input.limit)
      .lean(),
    ChallengeModel.countDocuments(filter),
  ]);

  return { items, total };
}

export async function getPublicChallengeBySlug(slug: string): Promise<Challenge> {
  const challenge = await ChallengeModel.findOne({
    slug: slug.toLowerCase(),
    status: "published",
  }).lean<Challenge | null>();
  if (!challenge) throw AppError.notFound("CHALLENGE_NOT_FOUND", "Challenge not found");
  return challenge;
}

export async function getChallengeForJudging(challengeId: string) {
  return ChallengeModel.findById(challengeId)
    .select("+hiddenTests +referenceSolutions")
    .lean<Challenge | null>();
}

export async function adminListChallenges(
  input: AdminChallengeListInput,
): Promise<{ items: Challenge[]; total: number }> {
  const filter: Record<string, unknown> = {};
  if (input.status) filter.status = input.status;
  if (input.topic && input.topic !== "all") filter.topic = input.topic.toLowerCase();
  if (input.q) {
    filter.title = new RegExp(escapeRegex(input.q), "i");
  }

  const skip = (input.page - 1) * input.limit;
  const [items, total] = await Promise.all([
    ChallengeModel.find(filter)
      .select("-hiddenTests -referenceSolutions")
      .sort({ updatedAt: -1 })
      .skip(skip)
      .limit(input.limit)
      .lean(),
    ChallengeModel.countDocuments(filter),
  ]);

  return { items, total };
}

export async function adminGetChallenge(challengeId: string): Promise<Challenge> {
  const challenge = await ChallengeModel.findById(challengeId)
    .select("+hiddenTests +referenceSolutions")
    .lean<Challenge | null>();
  if (!challenge) throw AppError.notFound("CHALLENGE_NOT_FOUND", "Challenge not found");
  return challenge;
}

function assertStarterCodeCoverage(
  languages: Language[],
  starterCode: Record<string, string>,
): void {
  const missing = languages.filter((language) => !starterCode[language]);
  if (missing.length > 0) {
    throw AppError.badRequest(
      "VALIDATION_ERROR",
      `Starter code is required for: ${missing.join(", ")}`,
    );
  }
}

export async function createChallenge(
  input: CreateChallengeInput,
  adminId: string,
): Promise<Challenge> {
  assertStarterCodeCoverage(input.supportedLanguages, input.starterCode);

  const base = input.slug ? slugify(input.slug) : slugify(input.title, "challenge");
  const slug = await generateUniqueSlug(base, slugExists);

  const created = await ChallengeModel.create({
    title: input.title,
    slug,
    description: input.description,
    topic: input.topic.toLowerCase(),
    difficulty: input.difficulty,
    constraints: input.constraints ?? [],
    examples: input.examples ?? [],
    starterCode: new Map(Object.entries(input.starterCode)),
    supportedLanguages: input.supportedLanguages,
    hiddenTests: (input.hiddenTests ?? []).map((test) => ({
      name: test.name ?? null,
      stdin: test.stdin,
      expectedStdout: test.expectedStdout,
    })),
    referenceSolutions: input.referenceSolutions
      ? new Map(Object.entries(input.referenceSolutions))
      : new Map(),
    ...(input.timeLimitMs === undefined ? {} : { timeLimitMs: input.timeLimitMs }),
    ...(input.memoryLimitMb === undefined ? {} : { memoryLimitMb: input.memoryLimitMb }),
    ...(input.outputLimitBytes === undefined ? {} : { outputLimitBytes: input.outputLimitBytes }),
    points: input.points ?? 100,
    rewardPolicyVersion: input.rewardPolicyVersion ?? 1,
    status: input.status ?? "draft",
    createdBy: adminId,
  });

  return created.toObject() as Challenge;
}

export async function updateChallenge(
  challengeId: string,
  input: UpdateChallengeInput,
): Promise<Challenge> {
  const challenge = await ChallengeModel.findById(challengeId).select(
    "+hiddenTests +referenceSolutions",
  );
  if (!challenge) throw AppError.notFound("CHALLENGE_NOT_FOUND", "Challenge not found");

  const languages = input.supportedLanguages ?? challenge.supportedLanguages;
  const starterCode = input.starterCode
    ? input.starterCode
    : (challenge.starterCode instanceof Map
        ? Object.fromEntries(challenge.starterCode)
        : (challenge.starterCode as Record<string, string>));
  assertStarterCodeCoverage(languages as Language[], starterCode);

  if (input.title !== undefined) challenge.title = input.title;
  if (input.description !== undefined) challenge.description = input.description;
  if (input.topic !== undefined) challenge.topic = input.topic.toLowerCase();
  if (input.difficulty !== undefined) challenge.difficulty = input.difficulty;
  if (input.constraints !== undefined) challenge.constraints = input.constraints;
  if (input.examples !== undefined) {
    challenge.examples = input.examples.map((example) => ({
      input: example.input,
      output: example.output,
      explanation: example.explanation ?? null,
    }));
  }
  if (input.starterCode !== undefined) {
    challenge.starterCode = new Map(Object.entries(input.starterCode));
  }
  if (input.supportedLanguages !== undefined) {
    challenge.supportedLanguages = input.supportedLanguages;
  }
  if (input.hiddenTests !== undefined) {
    challenge.hiddenTests = input.hiddenTests.map((test) => ({
      name: test.name ?? null,
      stdin: test.stdin,
      expectedStdout: test.expectedStdout,
    }));
  }
  if (input.referenceSolutions !== undefined) {
    challenge.referenceSolutions = new Map(Object.entries(input.referenceSolutions));
  }
  if (input.timeLimitMs !== undefined) challenge.timeLimitMs = input.timeLimitMs;
  if (input.memoryLimitMb !== undefined) challenge.memoryLimitMb = input.memoryLimitMb;
  if (input.outputLimitBytes !== undefined) challenge.outputLimitBytes = input.outputLimitBytes;
  if (input.points !== undefined) challenge.points = input.points;
  if (input.rewardPolicyVersion !== undefined) {
    challenge.rewardPolicyVersion = input.rewardPolicyVersion;
  }
  if (input.status !== undefined) challenge.status = input.status;

  if (input.slug !== undefined) {
    const nextSlug = slugify(input.slug);
    if (nextSlug !== challenge.slug) {
      const taken = await ChallengeModel.exists({ slug: nextSlug, _id: { $ne: challenge._id } });
      if (taken) throw AppError.conflict("SLUG_TAKEN", "That slug is already in use");
      challenge.slug = nextSlug;
    }
  }

  await challenge.save();
  return challenge.toObject() as Challenge;
}

/** Soft delete: archived challenges disappear from public listings but keep history. */
export async function archiveChallenge(challengeId: string): Promise<void> {
  const result = await ChallengeModel.updateOne(
    { _id: challengeId },
    { $set: { status: "archived" } },
  );
  if (result.matchedCount === 0) {
    throw AppError.notFound("CHALLENGE_NOT_FOUND", "Challenge not found");
  }
}
