import mongoose, { Document, Schema } from "mongoose";

export type VapiWebhookEventStatus = "processing" | "processed" | "failed" | "incomplete";

export interface IVapiWebhookEvent extends Document {
  eventKey: string;
  callId: string;
  type: string;
  status: VapiWebhookEventStatus;
  error?: string;
  processedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Vapi webhook event-level deduplication (Dograh pattern).
 *
 * One row per `vapi:<type>:<callId>` delivery key. The unique `eventKey`
 * lets concurrent deliveries race safely: the first insert claims the event,
 * later duplicates are acked (or reclaim failed/incomplete/stale rows) instead
 * of double-upserting the Conversation store. `incomplete` stays reclaimable
 * so a Vapi retry can fill in transcript content that was missing on the
 * first delivery.
 */
const VapiWebhookEventSchema = new Schema<IVapiWebhookEvent>(
  {
    eventKey: { type: String, required: true, unique: true, index: true },
    callId: { type: String, required: true, index: true },
    type: { type: String, required: true },
    status: {
      type: String,
      enum: ["processing", "processed", "failed", "incomplete"],
      required: true,
      index: true,
    },
    error: { type: String, maxlength: 500 },
    processedAt: Date,
  },
  { timestamps: true }
);

export default mongoose.models.VapiWebhookEvent ||
  mongoose.model<IVapiWebhookEvent>("VapiWebhookEvent", VapiWebhookEventSchema);
