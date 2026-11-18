import { Schema, type Types } from "mongoose";
import { getModel } from "../model";

export interface AuditLog {
  _id: Types.ObjectId;
  actorId: Types.ObjectId | null;
  action: string;
  targetType: string;
  targetId: string;
  metadata: Record<string, unknown>;
  ip: string | null;
  requestId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

const auditLogSchema = new Schema<AuditLog>(
  {
    actorId: { type: Schema.Types.ObjectId, ref: "User", default: null, index: true },
    action: { type: String, required: true, maxlength: 80, index: true },
    targetType: { type: String, required: true, maxlength: 40 },
    targetId: { type: String, required: true, maxlength: 80 },
    // Safe metadata only: never tokens, passwords, source code or hidden tests.
    metadata: { type: Schema.Types.Mixed, default: {} },
    ip: { type: String, maxlength: 64, default: null },
    requestId: { type: String, maxlength: 64, default: null },
  },
  { timestamps: true },
);

auditLogSchema.index({ createdAt: -1 });

export const AuditLogModel = getModel<AuditLog>("AuditLog", auditLogSchema);
