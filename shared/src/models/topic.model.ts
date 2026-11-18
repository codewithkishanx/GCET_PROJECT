import { Schema, type Types } from "mongoose";
import { TOPIC_STATUSES, type TopicStatus } from "../enums";
import { getModel } from "../model";

export interface TopicAlgorithm {
  slug: string;
  title: string;
  description: string;
  complexity?: { time?: string; space?: string } | null;
}

export interface Topic {
  _id: Types.ObjectId;
  slug: string;
  title: string;
  summary: string;
  contentMarkdown: string;
  algorithms: TopicAlgorithm[];
  order: number;
  status: TopicStatus;
  createdAt: Date;
  updatedAt: Date;
}

const algorithmSchema = new Schema<TopicAlgorithm>(
  {
    slug: { type: String, required: true, trim: true, maxlength: 80 },
    title: { type: String, required: true, trim: true, maxlength: 120 },
    description: { type: String, required: true, trim: true, maxlength: 600 },
    complexity: {
      type: new Schema(
        {
          time: { type: String, trim: true, maxlength: 80 },
          space: { type: String, trim: true, maxlength: 80 },
        },
        { _id: false },
      ),
      default: null,
    },
  },
  { _id: false },
);

const topicSchema = new Schema<Topic>(
  {
    slug: { type: String, required: true, unique: true, trim: true, lowercase: true, maxlength: 80 },
    title: { type: String, required: true, trim: true, maxlength: 120 },
    summary: { type: String, required: true, trim: true, maxlength: 400 },
    contentMarkdown: { type: String, required: true, maxlength: 60_000 },
    algorithms: { type: [algorithmSchema], default: [] },
    order: { type: Number, default: 0, required: true },
    status: { type: String, enum: TOPIC_STATUSES, default: "published", required: true },
  },
  { timestamps: true },
);

topicSchema.index({ status: 1, order: 1 });

export const TopicModel = getModel<Topic>("Topic", topicSchema);
