import mongoose, { Schema, Document } from "mongoose";
import type {
  ContentEventType,
  ContentRefType,
  PublicationPayload,
} from "@/lib/social-publisher/types";

export interface IContentEvent extends Document {
  type: ContentEventType;
  contentType: ContentRefType;
  contentId: mongoose.Types.ObjectId;
  revision: string;
  eventKey: string;
  payload: PublicationPayload;
  platforms: string[];
  actorId?: mongoose.Types.ObjectId;
  status: "pending" | "processed" | "skipped" | "failed";
  attempts: number;
  error?: string;
  processedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const ContentEventSchema = new Schema<IContentEvent>(
  {
    type: {
      type: String,
      enum: ["published", "updated", "unpublished"],
      required: true,
    },
    contentType: {
      type: String,
      enum: ["blog", "content-item"],
      required: true,
    },
    contentId: { type: Schema.Types.ObjectId, required: true },
    revision: { type: String, required: true },
    eventKey: { type: String, required: true },
    payload: { type: Schema.Types.Mixed, required: true },
    platforms: [{ type: String }],
    actorId: { type: Schema.Types.ObjectId, ref: "User" },
    status: {
      type: String,
      enum: ["pending", "processed", "skipped", "failed"],
      default: "pending",
    },
    attempts: { type: Number, default: 0 },
    error: String,
    processedAt: Date,
  },
  { timestamps: true }
);

ContentEventSchema.index({ eventKey: 1 }, { unique: true });
ContentEventSchema.index({ status: 1, createdAt: 1 });
ContentEventSchema.index({ contentType: 1, contentId: 1 });

export default mongoose.models.ContentEvent ||
  mongoose.model<IContentEvent>("ContentEvent", ContentEventSchema);
