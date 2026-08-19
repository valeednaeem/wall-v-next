import mongoose, { Schema, Document } from "mongoose";

export interface ITrackingEvent extends Document {
  eventName: string;
  displayName: string;
  description: string;
  category: "page_view" | "click" | "form_submit" | "download" | "video_play" | "scroll" | "engagement" | "conversion" | "ecommerce" | "custom";
  parameters: Array<{
    name: string;
    type: "string" | "number" | "boolean" | "json";
    required: boolean;
    description: string;
  }>;
  triggers: Array<{
    type: "auto" | "manual" | "data_layer" | "gtm";
    selector?: string;
    event?: string;
    condition?: string;
  }>;
  isActive: boolean;
  isSystem: boolean;
  googleAdsConversionId?: string;
  metaPixelId?: string;
  ga4EventName?: string;
  createdAt: Date;
  updatedAt: Date;
}

const TrackingEventSchema = new Schema<ITrackingEvent>(
  {
    eventName: { type: String, required: true, unique: true },
    displayName: { type: String, required: true },
    description: String,
    category: {
      type: String,
      enum: ["page_view", "click", "form_submit", "download", "video_play", "scroll", "engagement", "conversion", "ecommerce", "custom"],
      default: "custom",
    },
    parameters: [
      {
        name: String,
        type: { type: String, enum: ["string", "number", "boolean", "json"], default: "string" },
        required: { type: Boolean, default: false },
        description: String,
      },
    ],
    triggers: [
      {
        type: { type: String, enum: ["auto", "manual", "data_layer", "gtm"], default: "auto" },
        selector: String,
        event: String,
        condition: String,
      },
    ],
    isActive: { type: Boolean, default: true },
    isSystem: { type: Boolean, default: false },
    googleAdsConversionId: String,
    metaPixelId: String,
    ga4EventName: String,
  },
  { timestamps: true }
);

TrackingEventSchema.index({ eventName: 1 });
TrackingEventSchema.index({ isSystem: 1 });
TrackingEventSchema.index({ isActive: 1 });

export default mongoose.models.TrackingEvent ||
  mongoose.model<ITrackingEvent>("TrackingEvent", TrackingEventSchema);