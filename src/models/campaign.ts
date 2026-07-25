import mongoose, { Schema, Document } from "mongoose";

export interface ICampaign extends Document {
  name: string;
  type: "email" | "sms" | "social" | "ads" | "whatsapp";
  status: "draft" | "scheduled" | "active" | "paused" | "completed";
  subject?: string;
  content: string;
  audience: {
    type: string;
    filter?: Record<string, unknown>;
  };
  scheduledAt?: Date;
  startedAt?: Date;
  completedAt?: Date;
  stats: {
    sent: number;
    delivered: number;
    opened: number;
    clicked: number;
    bounced: number;
    unsubscribed: number;
  };
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const CampaignSchema = new Schema<ICampaign>(
  {
    name: { type: String, required: true, trim: true },
    type: {
      type: String,
      enum: ["email", "sms", "social", "ads", "whatsapp"],
      required: true,
    },
    status: {
      type: String,
      enum: ["draft", "scheduled", "active", "paused", "completed"],
      default: "draft",
    },
    subject: String,
    content: { type: String, required: true },
    audience: {
      type: { type: String, required: true },
      filter: { type: Schema.Types.Mixed },
    },
    scheduledAt: Date,
    startedAt: Date,
    completedAt: Date,
    stats: {
      sent: { type: Number, default: 0 },
      delivered: { type: Number, default: 0 },
      opened: { type: Number, default: 0 },
      clicked: { type: Number, default: 0 },
      bounced: { type: Number, default: 0 },
      unsubscribed: { type: Number, default: 0 },
    },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

CampaignSchema.index({ status: 1 });
CampaignSchema.index({ type: 1 });

export default mongoose.models.Campaign ||
  mongoose.model<ICampaign>("Campaign", CampaignSchema);
