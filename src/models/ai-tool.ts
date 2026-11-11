import mongoose, { Schema, Document } from "mongoose";

export type AccessModel = "free" | "freemium" | "subscription";
export type ToolStatus = "draft" | "testing" | "published" | "unpublished" | "archived";

export interface IAITool extends Document {
  name: string;
  slug: string;
  shortDescription?: string;
  description?: string;
  icon?: string;
  featuredImage?: string;
  category: mongoose.Types.ObjectId;
  tags: mongoose.Types.ObjectId[];
  accessModel: AccessModel;
  status: ToolStatus;
  features: string[];
  flags: {
    isFeatured: boolean;
    isNew: boolean;
    isPopular: boolean;
    isRecommended: boolean;
    isComingSoon: boolean;
  };
  displayOrder: number;
  visibility: { homepage: boolean; toolsPage: boolean; categoryPage: boolean };
  usagePolicy: {
    dailyLimit: number;
    monthlyLimit: number;
    lifetimeFreeExecutions: number;
    creditsPerExecution: number;
    rateLimitPerMinute: number;
    maxInputLength: number;
    maxOutputLength: number;
  };
  aiConfig: {
    provider?: mongoose.Types.ObjectId;
    model?: string;
    routing: "provider" | "global-default";
    fallbackModel?: string;
  };
  requiredPlan?: mongoose.Types.ObjectId;
  seo?: {
    metaTitle?: string;
    metaDescription?: string;
    keywords?: string[];
    canonicalUrl?: string;
  };
  social?: { ogImage?: string; twitterHandle?: string };
  stats: {
    uniqueUsers: number;
    executions: number;
    successCount: number;
    failureCount: number;
    credits: number;
    estimatedCost: number;
    revenue: number;
    conversionRate: number;
    lastExecutedAt?: Date;
  };
  createdBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const AIToolSchema = new Schema<IAITool>(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true },
    shortDescription: { type: String, trim: true },
    description: { type: String },
    icon: { type: String },
    featuredImage: { type: String },
    category: { type: Schema.Types.ObjectId, ref: "AIToolCategory", required: true },
    tags: [{ type: Schema.Types.ObjectId, ref: "AIToolTag" }],
    accessModel: { type: String, enum: ["free", "freemium", "subscription"], default: "free" },
    status: {
      type: String,
      enum: ["draft", "testing", "published", "unpublished", "archived"],
      default: "draft",
    },
    features: [{ type: String }],
    flags: {
      isFeatured: { type: Boolean, default: false },
      isNew: { type: Boolean, default: false },
      isPopular: { type: Boolean, default: false },
      isRecommended: { type: Boolean, default: false },
      isComingSoon: { type: Boolean, default: false },
    },
    displayOrder: { type: Number, default: 0 },
    visibility: {
      homepage: { type: Boolean, default: true },
      toolsPage: { type: Boolean, default: true },
      categoryPage: { type: Boolean, default: true },
    },
    usagePolicy: {
      dailyLimit: { type: Number, default: 0, min: 0 },
      monthlyLimit: { type: Number, default: 0, min: 0 },
      lifetimeFreeExecutions: { type: Number, default: 0, min: 0 },
      creditsPerExecution: { type: Number, default: 1, min: 0 },
      rateLimitPerMinute: { type: Number, default: 5, min: 0 },
      maxInputLength: { type: Number, default: 0, min: 0 },
      maxOutputLength: { type: Number, default: 0, min: 0 },
    },
    aiConfig: {
      provider: { type: Schema.Types.ObjectId, ref: "AIToolProvider" },
      model: { type: String },
      routing: { type: String, enum: ["provider", "global-default"], default: "global-default" },
      fallbackModel: { type: String },
    },
    requiredPlan: { type: Schema.Types.ObjectId, ref: "AIToolPlan" },
    seo: {
      metaTitle: { type: String },
      metaDescription: { type: String },
      keywords: [{ type: String }],
      canonicalUrl: { type: String },
    },
    social: {
      ogImage: { type: String },
      twitterHandle: { type: String },
    },
    stats: {
      uniqueUsers: { type: Number, default: 0 },
      executions: { type: Number, default: 0 },
      successCount: { type: Number, default: 0 },
      failureCount: { type: Number, default: 0 },
      credits: { type: Number, default: 0 },
      estimatedCost: { type: Number, default: 0 },
      revenue: { type: Number, default: 0 },
      conversionRate: { type: Number, default: 0 },
      lastExecutedAt: { type: Date },
    },
    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

AIToolSchema.index({ status: 1 });
AIToolSchema.index({ category: 1 });
AIToolSchema.index({ accessModel: 1 });
AIToolSchema.index({ createdAt: -1 });
AIToolSchema.index({ displayOrder: 1 });

export default mongoose.models.AITool || mongoose.model<IAITool>("AITool", AIToolSchema);
