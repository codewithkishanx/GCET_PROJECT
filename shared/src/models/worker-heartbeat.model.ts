import { Schema, type Types } from "mongoose";
import { getModel } from "../model";

/**
 * Liveness record written by the execution worker. Kept in MongoDB so the API
 * does not need its own Redis connection just to answer "is a worker alive?".
 */
export interface WorkerHeartbeat {
  _id: Types.ObjectId;
  key: string;
  lastSeenAt: Date;
  concurrency: number;
  version: string;
  createdAt: Date;
  updatedAt: Date;
}

const heartbeatSchema = new Schema<WorkerHeartbeat>(
  {
    key: { type: String, required: true, unique: true, default: "worker" },
    lastSeenAt: { type: Date, required: true },
    concurrency: { type: Number, required: true, min: 1 },
    version: { type: String, required: true, maxlength: 40 },
  },
  { timestamps: true },
);

heartbeatSchema.index({ lastSeenAt: -1 });

export const WorkerHeartbeatModel = getModel<WorkerHeartbeat>(
  "WorkerHeartbeat",
  heartbeatSchema,
);
