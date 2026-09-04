import mongoose, { Schema, Document } from "mongoose";

export interface IContentDistribution extends Document {
  contentItem: mongoose.Types.ObjectId;
  platform: string;
  status:
    | "pending"
    | "publishing"
    | "published"
    | "failed"
    | "retrying"
    | "cancelled"
    | "requires_auth";
  platformPostId?: string;
  platformUrl?: string;
  publishedAt?: Date;
  error?: string;
  retryCount: number;
  maxRetries: number;
  lastRetryAt?: Date;
  response?: Record<string, unknown>;
  approvalRequired: boolean;
  approvedBy?: mongoose.Types.ObjectId;
  approvedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const ContentDistributionSchema = new Schema<IContentDistribution>(
  {
    contentItem: {
      type: Schema.Types.ObjectId,
      ref: "ContentItem",
      required: true,
    },
    platform: { type: String, required: true },
    status: {
      type: String,
      enum: [
        "pending",
        "publishing",
        "published",
        "failed",
        "retrying",
        "cancelled",
        "requires_auth",
      ],
      default: "pending",
    },
    platformPostId: String,
    platformUrl: String,
    publishedAt: Date,
    error: String,
    retryCount: { type: Number, default: 0 },
    maxRetries: { type: Number, default: 3 },
    lastRetryAt: Date,
    response: { type: Schema.Types.Mixed },
    approvalRequired: { type: Boolean, default: false },
    approvedBy: { type: Schema.Types.ObjectId, ref: "User" },
    approvedAt: Date,
  },
  { timestamps: true }
);

ContentDistributionSchema.index({ contentItem: 1 });
ContentDistributionSchema.index({ platform: 1 });
ContentDistributionSchema.index({ status: 1 });

export default mongoose.models.ContentDistribution ||
  mongoose.model<IContentDistribution>(
    "ContentDistribution",
    ContentDistributionSchema
  );
