import { Schema, type Types } from "mongoose";
import {
  REPORT_REASONS,
  REPORT_STATUSES,
  REPORT_TARGET_TYPES,
  type ReportReason,
  type ReportStatus,
  type ReportTargetType,
} from "../enums";
import { getModel } from "../model";

export interface Report {
  _id: Types.ObjectId;
  reporterId: Types.ObjectId;
  targetType: ReportTargetType;
  targetId: Types.ObjectId;
  reason: ReportReason;
  details: string;
  status: ReportStatus;
  resolvedBy: Types.ObjectId | null;
  resolutionNote: string | null;
  resolvedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const reportSchema = new Schema<Report>(
  {
    reporterId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    targetType: { type: String, enum: REPORT_TARGET_TYPES, required: true },
    targetId: { type: Schema.Types.ObjectId, required: true },
    reason: { type: String, enum: REPORT_REASONS, required: true },
    details: { type: String, trim: true, maxlength: 1_000, default: "" },
    status: { type: String, enum: REPORT_STATUSES, default: "open", required: true, index: true },
    resolvedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
    resolutionNote: { type: String, maxlength: 500, default: null },
    resolvedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

reportSchema.index({ targetType: 1, targetId: 1 });
reportSchema.index({ status: 1, createdAt: -1 });
// A reporter cannot stack identical open reports against the same target.
reportSchema.index(
  { reporterId: 1, targetType: 1, targetId: 1, status: 1 },
  { unique: false },
);

export const ReportModel = getModel<Report>("Report", reportSchema);
