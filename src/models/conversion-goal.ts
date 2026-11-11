import mongoose, { Schema, Document } from "mongoose";

export interface IConversionGoal extends Document {
  name: string;
  eventName: string;
  type: "destination" | "event" | "duration" | "pages_per_session" | "smart";
  value: number;
  currency: string;
  isActive: boolean;
  googleAdsConversionId?: string;
  metaPixelId?: string;
  ga4ConversionName?: string;
  countMethod: "once_per_session" | "every_time";
  attributionWindow: number;
  category: "purchase" | "lead" | "sign_up" | "demo" | "contact" | "download" | "custom";
  description: string;
  createdAt: Date;
  updatedAt: Date;
}

const ConversionGoalSchema = new Schema<IConversionGoal>(
  {
    name: { type: String, required: true },
    eventName: { type: String, required: true },
    type: {
      type: String,
      enum: ["destination", "event", "duration", "pages_per_session", "smart"],
      default: "event",
    },
    value: { type: Number, default: 0 },
    currency: { type: String, default: "USD" },
    isActive: { type: Boolean, default: true },
    googleAdsConversionId: String,
    metaPixelId: String,
    ga4ConversionName: String,
    countMethod: {
      type: String,
      enum: ["once_per_session", "every_time"],
      default: "once_per_session",
    },
    attributionWindow: { type: Number, default: 30 },
    category: {
      type: String,
      enum: ["purchase", "lead", "sign_up", "demo", "contact", "download", "custom"],
      default: "custom",
    },
    description: String,
  },
  { timestamps: true }
);

ConversionGoalSchema.index({ eventName: 1 });
ConversionGoalSchema.index({ isActive: 1 });
ConversionGoalSchema.index({ category: 1 });

export default mongoose.models.ConversionGoal ||
  mongoose.model<IConversionGoal>("ConversionGoal", ConversionGoalSchema);