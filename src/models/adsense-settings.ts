import mongoose, { Schema, Document } from "mongoose";

export interface IAdSenseSettings extends Document {
  key: string;
  enabled: boolean;
  publisherId: string;
  autoAdsEnabled: boolean;
  autoAdsConfig: {
    googleAdsOptOut: boolean;
    noiseReduction: boolean;
    adFormats: {
      inArticle: boolean;
      inFeed: boolean;
      matchedContent: boolean;
      multiplex: boolean;
    };
  };
  adUnits: Array<{
    id: string;
    name: string;
    format: "display" | "in-article" | "in-feed" | "matched-content" | "multiplex";
    slot: string;
    size: { width: number; height: number } | "fluid";
    enabled: boolean;
    placement: string;
  }>;
  status: "not_configured" | "configured" | "awaiting_approval" | "active" | "error";
  lastVerifiedAt: Date | null;
  lastError: string | null;
  createdAt: Date;
  updatedAt: Date;
}

const adSenseSettingsSchema = new Schema<IAdSenseSettings>(
  {
    key: { type: String, default: "adsense", unique: true },
    enabled: { type: Boolean, default: false },
    publisherId: { type: String, default: "" },
    autoAdsEnabled: { type: Boolean, default: false },
    autoAdsConfig: {
      googleAdsOptOut: { type: Boolean, default: false },
      noiseReduction: { type: Boolean, default: false },
      adFormats: {
        inArticle: { type: Boolean, default: true },
        inFeed: { type: Boolean, default: true },
        matchedContent: { type: Boolean, default: false },
        multiplex: { type: Boolean, default: true },
      },
    },
    adUnits: [
      {
        id: { type: String, required: true },
        name: { type: String, required: true },
        format: {
          type: String,
          enum: ["display", "in-article", "in-feed", "matched-content", "multiplex"],
        },
        slot: { type: String, required: true },
        size: { type: Schema.Types.Mixed, default: "fluid" },
        enabled: { type: Boolean, default: true },
        placement: { type: String, default: "" },
      },
    ],
    status: {
      type: String,
      enum: ["not_configured", "configured", "awaiting_approval", "active", "error"],
      default: "not_configured",
    },
    lastVerifiedAt: { type: Date, default: null },
    lastError: { type: String, default: null },
  },
  { timestamps: true }
);

export default mongoose.models.AdSenseSettings ||
  mongoose.model<IAdSenseSettings>("AdSenseSettings", adSenseSettingsSchema);
