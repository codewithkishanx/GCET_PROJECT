import { Schema, type Types } from "mongoose";
import {
  LANGUAGES,
  SUBMISSION_STATUSES,
  VERDICTS,
  type Language,
  type SubmissionStatus,
  type Verdict,
} from "../enums";
import { getModel } from "../model";

export interface FailedTestInfo {
  index: number;
  input: string;
  expectedOutput: string;
  actualOutput?: string | null;
}

export interface Submission {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  challengeId: Types.ObjectId;
  language: Language;
  sourceCode?: string;
  status: SubmissionStatus;
  verdict: Verdict | null;
  passedTests: number;
  totalTests: number;
  durationMs: number | null;
  memoryKb: number | null;
  outputPreview: string | null;
  failedTest?: FailedTestInfo | null;
  message: string | null;
  pointsAwarded: number;
  jobId: string | null;
  startedAt: Date | null;
  completedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const submissionSchema = new Schema<Submission>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    challengeId: { type: Schema.Types.ObjectId, ref: "Challenge", required: true, index: true },
    language: { type: String, enum: LANGUAGES, required: true },
    // Selected explicitly by the judge and by the owner's own detail view.
    sourceCode: { type: String, required: true, select: false, maxlength: 100_000 },
    status: { type: String, enum: SUBMISSION_STATUSES, default: "queued", required: true, index: true },
    verdict: { type: String, enum: [...VERDICTS, null], default: null },
    passedTests: { type: Number, default: 0, min: 0, required: true },
    totalTests: { type: Number, default: 0, min: 0, required: true },
    durationMs: { type: Number, default: null, min: 0 },
    memoryKb: { type: Number, default: null, min: 0 },
    // Truncated compiler/runtime output. Treated as untrusted text everywhere.
    outputPreview: { type: String, default: null, maxlength: 8_000 },
    failedTest: {
      type: {
        index: { type: Number, required: true },
        input: { type: String, default: "", maxlength: 4_000 },
        expectedOutput: { type: String, default: "", maxlength: 4_000 },
        actualOutput: { type: String, default: null, maxlength: 4_000 },
      },
      default: null,
      _id: false,
    },
    message: { type: String, default: null, maxlength: 500 },
    pointsAwarded: { type: Number, default: 0, min: 0, required: true },
    jobId: { type: String, default: null, maxlength: 80 },
    startedAt: { type: Date, default: null },
    completedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

submissionSchema.index({ userId: 1, createdAt: -1 });
submissionSchema.index({ challengeId: 1, createdAt: -1 });
submissionSchema.index({ userId: 1, status: 1 });
submissionSchema.index({ challengeId: 1, userId: 1, verdict: 1 });

export const SubmissionModel = getModel<Submission>("Submission", submissionSchema);
