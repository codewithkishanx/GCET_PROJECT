import { Schema, type Types } from "mongoose";
import {
  CHALLENGE_STATUSES,
  DIFFICULTIES,
  LANGUAGES,
  type ChallengeStatus,
  type Difficulty,
  type Language,
} from "../enums";
import { getModel } from "../model";

export interface ChallengeExample {
  input: string;
  output: string;
  explanation?: string | null;
}

/**
 * Server-only test case. Never selected by public queries, never serialized into
 * a public API response, never sent to the sandbox.
 */
export interface HiddenTest {
  name?: string | null;
  stdin: string;
  expectedStdout: string;
}

export interface Challenge {
  _id: Types.ObjectId;
  title: string;
  slug: string;
  description: string;
  topic: string;
  difficulty: Difficulty;
  constraints: string[];
  examples: ChallengeExample[];
  starterCode: Map<string, string> | Record<string, string>;
  supportedLanguages: Language[];
  hiddenTests?: HiddenTest[];
  referenceSolutions?: Map<string, string> | Record<string, string>;
  timeLimitMs: number;
  memoryLimitMb: number;
  outputLimitBytes: number;
  points: number;
  rewardPolicyVersion: number;
  status: ChallengeStatus;
  createdBy?: Types.ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
}

const exampleSchema = new Schema<ChallengeExample>(
  {
    input: { type: String, required: true, maxlength: 4_000 },
    output: { type: String, required: true, maxlength: 4_000 },
    explanation: { type: String, maxlength: 2_000, default: null },
  },
  { _id: false },
);

const hiddenTestSchema = new Schema<HiddenTest>(
  {
    name: { type: String, maxlength: 120, default: null },
    stdin: { type: String, required: true, maxlength: 20_000 },
    expectedStdout: { type: String, required: true, maxlength: 20_000 },
  },
  { _id: false },
);

const challengeSchema = new Schema<Challenge>(
  {
    title: { type: String, required: true, trim: true, maxlength: 160 },
    slug: { type: String, required: true, unique: true, trim: true, lowercase: true, maxlength: 160 },
    description: { type: String, required: true, maxlength: 40_000 },
    topic: { type: String, required: true, trim: true, lowercase: true, maxlength: 80, index: true },
    difficulty: { type: String, enum: DIFFICULTIES, required: true, index: true },
    constraints: { type: [String], default: [] },
    examples: { type: [exampleSchema], default: [] },
    starterCode: { type: Map, of: String, required: true },
    supportedLanguages: {
      type: [String],
      enum: LANGUAGES,
      required: true,
      validate: {
        validator: (value: Language[]) => Array.isArray(value) && value.length > 0,
        message: "At least one supported language is required",
      },
    },
    hiddenTests: { type: [hiddenTestSchema], default: undefined, select: false },
    referenceSolutions: { type: Map, of: String, select: false, default: undefined },
    timeLimitMs: { type: Number, required: true, min: 100, max: 15_000, default: 2_000 },
    memoryLimitMb: { type: Number, required: true, min: 32, max: 512, default: 128 },
    outputLimitBytes: { type: Number, required: true, min: 1_024, max: 1_048_576, default: 64_000 },
    points: { type: Number, required: true, min: 0, max: 10_000, default: 100 },
    rewardPolicyVersion: { type: Number, required: true, min: 1, default: 1 },
    status: { type: String, enum: CHALLENGE_STATUSES, default: "draft", required: true, index: true },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
  },
  { timestamps: true },
);

challengeSchema.index({ status: 1, difficulty: 1, topic: 1 });
challengeSchema.index({ title: "text", description: "text" });

export const ChallengeModel = getModel<Challenge>("Challenge", challengeSchema);
