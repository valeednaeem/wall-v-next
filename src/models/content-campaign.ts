import mongoose, { Schema, Document } from "mongoose";

export interface IContentCampaign extends Document {
  name: string;
  slug: string;
  description?: string;
  status:
    | "draft"
    | "researching"
    | "planned"
    | "pending_approval"
    | "changes_requested"
    | "approved"
    | "executing"
    | "partially_completed"
    | "completed"
    | "paused"
    | "rejected"
    | "cancelled"
    | "failed";
  dateRange: {
    start: Date;
    end: Date;
  };
  businessObjectives: string[];
  targetAudience: string[];
  contentPillars: {
    name: string;
    description: string;
    keywords: string[];
  }[];
  productServicePriorities: {
    type: "product" | "service" | "hosting";
    name: string;
    slug: string;
    priority: number;
  }[];
  planVersion: number;
  approvedBy?: mongoose.Types.ObjectId;
  approvedAt?: Date;
  pausedAt?: Date;
  cancelledAt?: Date;
  completionPercentage: number;
  stats: {
    totalTopics: number;
    totalArticles: number;
    totalPublished: number;
    totalSocialPosts: number;
    totalMediaAssets: number;
    avgQualityScore: number;
  };
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const ContentCampaignSchema = new Schema<IContentCampaign>(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true },
    description: String,
    status: {
      type: String,
      enum: [
        "draft",
        "researching",
        "planned",
        "pending_approval",
        "changes_requested",
        "approved",
        "executing",
        "partially_completed",
        "completed",
        "paused",
        "rejected",
        "cancelled",
        "failed",
      ],
      default: "draft",
    },
    dateRange: {
      start: { type: Date, required: true },
      end: { type: Date, required: true },
    },
    businessObjectives: [String],
    targetAudience: [String],
    contentPillars: [
      {
        name: { type: String, required: true },
        description: String,
        keywords: [String],
      },
    ],
    productServicePriorities: [
      {
        type: {
          type: String,
          enum: ["product", "service", "hosting"],
          required: true,
        },
        name: { type: String, required: true },
        slug: { type: String, required: true },
        priority: { type: Number, required: true },
      },
    ],
    planVersion: { type: Number, default: 1 },
    approvedBy: { type: Schema.Types.ObjectId, ref: "User" },
    approvedAt: Date,
    pausedAt: Date,
    cancelledAt: Date,
    completionPercentage: { type: Number, default: 0 },
    stats: {
      totalTopics: { type: Number, default: 0 },
      totalArticles: { type: Number, default: 0 },
      totalPublished: { type: Number, default: 0 },
      totalSocialPosts: { type: Number, default: 0 },
      totalMediaAssets: { type: Number, default: 0 },
      avgQualityScore: { type: Number, default: 0 },
    },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

ContentCampaignSchema.index({ slug: 1 });
ContentCampaignSchema.index({ status: 1 });
ContentCampaignSchema.index({ "dateRange.start": 1 });

export default mongoose.models.ContentCampaign ||
  mongoose.model<IContentCampaign>("ContentCampaign", ContentCampaignSchema);
