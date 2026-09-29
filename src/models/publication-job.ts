import mongoose, { Schema, Document } from "mongoose";
import type {
  ContentRefType,
  PublicationErrorCode,
  PublicationJobState,
  PublicationPayload,
} from "@/lib/social-publisher/types";

export interface IPublicationJob extends Document {
  contentType: ContentRefType;
  contentId: mongoose.Types.ObjectId;
  revision: string;
  platform: string;
  idempotencyKey: string;
  state: PublicationJobState;
  payload: PublicationPayload;
  attempt: number;
  maxAttempts: number;
  nextAttemptAt?: Date;
  leaseUntil?: Date;
  claimedBy?: string;
  platformPostId?: string;
  platformUrl?: string;
  publishedAt?: Date;
  error?: string;
  errorCode?: PublicationErrorCode;
  response?: Record<string, unknown>;
  generatedBy?: "ai" | "template" | "provided";
  actorId?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const PublicationJobSchema = new Schema<IPublicationJob>(
  {
    contentType: {
      type: String,
      enum: ["blog", "content-item"],
      required: true,
    },
    contentId: { type: Schema.Types.ObjectId, required: true },
    revision: { type: String, required: true },
    platform: { type: String, required: true },
    idempotencyKey: { type: String, required: true },
    state: {
      type: String,
      enum: [
        "pending",
        "processing",
        "published",
        "retrying",
        "failed",
        "cancelled",
        "needs_review",
      ],
      default: "pending",
    },
    payload: { type: Schema.Types.Mixed, default: {} },
    attempt: { type: Number, default: 0 },
    maxAttempts: { type: Number, default: 5 },
    nextAttemptAt: Date,
    leaseUntil: Date,
    claimedBy: String,
    platformPostId: String,
    platformUrl: String,
    publishedAt: Date,
    error: String,
    errorCode: {
      type: String,
      enum: [
        "requires_auth",
        "rate_limited",
        "provider_error",
        "exhausted",
        "cancelled",
        "not_eligible",
      ],
    },
    response: { type: Schema.Types.Mixed },
    generatedBy: { type: String, enum: ["ai", "template", "provided"] },
    actorId: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

PublicationJobSchema.index({ idempotencyKey: 1 }, { unique: true });
PublicationJobSchema.index({ state: 1, nextAttemptAt: 1 });
PublicationJobSchema.index({ contentType: 1, contentId: 1 });
PublicationJobSchema.index({ platform: 1, state: 1 });
PublicationJobSchema.index({ state: 1, leaseUntil: 1 });

export default mongoose.models.PublicationJob ||
  mongoose.model<IPublicationJob>("PublicationJob", PublicationJobSchema);
