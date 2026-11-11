import mongoose, { Schema, Document } from "mongoose";

export interface IContentMetric extends Document {
  contentItem: mongoose.Types.ObjectId;
  platform: string;
  date: Date;
  metrics: {
    impressions?: number;
    views?: number;
    clicks?: number;
    reactions?: number;
    comments?: number;
    shares?: number;
    saves?: number;
    watchTime?: number;
    retention?: number;
    ctr?: number;
    conversions?: number;
    followerGrowth?: number;
  };
  source:
    | "ga4"
    | "vercel"
    | "linkedin_api"
    | "facebook_api"
    | "instagram_api"
    | "x_api"
    | "youtube_api"
    | "manual";
  fetchedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const ContentMetricSchema = new Schema<IContentMetric>(
  {
    contentItem: {
      type: Schema.Types.ObjectId,
      ref: "ContentItem",
      required: true,
    },
    platform: { type: String, required: true },
    date: { type: Date, required: true },
    metrics: {
      impressions: { type: Number, default: 0 },
      views: { type: Number, default: 0 },
      clicks: { type: Number, default: 0 },
      reactions: { type: Number, default: 0 },
      comments: { type: Number, default: 0 },
      shares: { type: Number, default: 0 },
      saves: { type: Number, default: 0 },
      watchTime: { type: Number, default: 0 },
      retention: { type: Number, default: 0 },
      ctr: { type: Number, default: 0 },
      conversions: { type: Number, default: 0 },
      followerGrowth: { type: Number, default: 0 },
    },
    source: {
      type: String,
      enum: [
        "ga4",
        "vercel",
        "linkedin_api",
        "facebook_api",
        "instagram_api",
        "x_api",
        "youtube_api",
        "manual",
      ],
      required: true,
    },
    fetchedAt: Date,
  },
  { timestamps: true }
);

ContentMetricSchema.index({ contentItem: 1, platform: 1, date: 1 }, { unique: true });
ContentMetricSchema.index({ date: 1 });

export default mongoose.models.ContentMetric ||
  mongoose.model<IContentMetric>("ContentMetric", ContentMetricSchema);
