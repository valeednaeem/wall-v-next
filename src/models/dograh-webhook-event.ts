import mongoose, { Document, Schema } from "mongoose";

export type DograhWebhookEventStatus = "processing" | "processed" | "failed";

export interface IDograhWebhookEvent extends Document {
  eventKey: string;
  workflowRunId: string;
  status: DograhWebhookEventStatus;
  conversationId?: mongoose.Types.ObjectId;
  error?: string;
  processedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const DograhWebhookEventSchema = new Schema<IDograhWebhookEvent>(
  {
    eventKey: { type: String, required: true, unique: true, index: true },
    workflowRunId: { type: String, required: true, index: true },
    status: { type: String, enum: ["processing", "processed", "failed"], required: true, index: true },
    conversationId: { type: Schema.Types.ObjectId, ref: "Conversation" },
    error: { type: String, maxlength: 500 },
    processedAt: Date,
  },
  { timestamps: true }
);

export default mongoose.models.DograhWebhookEvent ||
  mongoose.model<IDograhWebhookEvent>("DograhWebhookEvent", DograhWebhookEventSchema);
