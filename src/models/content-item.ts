import mongoose, { Schema, Document } from "mongoose";

export interface IContentItem extends Document {
  campaign: mongoose.Types.ObjectId;
  plan?: mongoose.Types.ObjectId;
  topic?: mongoose.Types.ObjectId;
  type: "article" | "social_post" | "video_script" | "carousel" | "newsletter";
  platform?:
    | "blog"
    | "linkedin"
    | "facebook"
    | "instagram"
    | "x"
    | "tiktok"
    | "youtube"
    | "email";
  title: string;
  slug?: string;
  content?: string;
  excerpt?: string;
  featuredImage?: string;
  seo?: {
    metaTitle?: string;
    metaDescription?: string;
    keywords?: string[];
    canonicalUrl?: string;
  };
  status:
    | "draft"
    | "review"
    | "fact_check"
    | "seo_review"
    | "brand_review"
    | "approved"
    | "scheduled"
    | "publishing"
    | "published"
    | "failed"
    | "archived";
  qualityScores?: {
    research?: number;
    seo?: number;
    originality?: number;
    factualConfidence?: number;
    readability?: number;
    businessRelevance?: number;
    conversionPotential?: number;
    socialPotential?: number;
    videoPotential?: number;
    overall?: number;
  };
  authoringAgent?: string;
  reviewerAgent?: string;
  revisions: {
    content: string;
    revisedAt: Date;
    revisedBy: mongoose.Types.ObjectId;
    reason?: string;
  }[];
  internalLinks: {
    text: string;
    url: string;
  }[];
  externalLinks: {
    text: string;
    url: string;
    title?: string;
  }[];
  socialVariants: {
    platform: string;
    content: string;
    hashtags?: string[];
    scheduledAt?: Date;
  }[];
  videoScript?: {
    hook?: string;
    scenes: {
      visual: string;
      dialogue: string;
      duration: number;
    }[];
    captions?: string;
    thumbnailPrompt?: string;
  };
  assets: mongoose.Types.ObjectId[];
  distribution: mongoose.Types.ObjectId[];
  publishedAt?: Date;
  scheduledAt?: Date;
  approvalRequired: boolean;
  approvedBy?: mongoose.Types.ObjectId;
  approvedAt?: Date;
  rejectionReason?: string;
  relatedBlogPost?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const ContentItemSchema = new Schema<IContentItem>(
  {
    campaign: {
      type: Schema.Types.ObjectId,
      ref: "ContentCampaign",
      required: true,
    },
    plan: { type: Schema.Types.ObjectId, ref: "ContentPlan" },
    topic: { type: Schema.Types.ObjectId, ref: "ContentTopic" },
    type: {
      type: String,
      enum: ["article", "social_post", "video_script", "carousel", "newsletter"],
      required: true,
    },
    platform: {
      type: String,
      enum: ["blog", "linkedin", "facebook", "instagram", "x", "tiktok", "youtube", "email"],
    },
    title: { type: String, required: true, trim: true },
    slug: { type: String, unique: true, lowercase: true },
    content: String,
    excerpt: String,
    featuredImage: String,
    seo: {
      metaTitle: String,
      metaDescription: String,
      keywords: [String],
      canonicalUrl: String,
    },
    status: {
      type: String,
      enum: [
        "draft",
        "review",
        "fact_check",
        "seo_review",
        "brand_review",
        "approved",
        "scheduled",
        "publishing",
        "published",
        "failed",
        "archived",
      ],
      default: "draft",
    },
    qualityScores: {
      research: { type: Number, min: 0, max: 10 },
      seo: { type: Number, min: 0, max: 10 },
      originality: { type: Number, min: 0, max: 10 },
      factualConfidence: { type: Number, min: 0, max: 10 },
      readability: { type: Number, min: 0, max: 10 },
      businessRelevance: { type: Number, min: 0, max: 10 },
      conversionPotential: { type: Number, min: 0, max: 10 },
      socialPotential: { type: Number, min: 0, max: 10 },
      videoPotential: { type: Number, min: 0, max: 10 },
      overall: { type: Number, min: 0, max: 10 },
    },
    authoringAgent: String,
    reviewerAgent: String,
    revisions: [
      {
        content: { type: String, required: true },
        revisedAt: { type: Date, default: Date.now },
        revisedBy: { type: Schema.Types.ObjectId, ref: "User" },
        reason: String,
      },
    ],
    internalLinks: [
      {
        text: String,
        url: String,
      },
    ],
    externalLinks: [
      {
        text: String,
        url: String,
        title: String,
      },
    ],
    socialVariants: [
      {
        platform: { type: String, required: true },
        content: { type: String, required: true },
        hashtags: [String],
        scheduledAt: Date,
      },
    ],
    videoScript: {
      hook: String,
      scenes: [
        {
          visual: { type: String, required: true },
          dialogue: { type: String, required: true },
          duration: { type: Number, required: true },
        },
      ],
      captions: String,
      thumbnailPrompt: String,
    },
    assets: [{ type: Schema.Types.ObjectId, ref: "ContentAsset" }],
    distribution: [{ type: Schema.Types.ObjectId, ref: "ContentDistribution" }],
    publishedAt: Date,
    scheduledAt: Date,
    approvalRequired: { type: Boolean, default: true },
    approvedBy: { type: Schema.Types.ObjectId, ref: "User" },
    approvedAt: Date,
    rejectionReason: String,
    relatedBlogPost: { type: Schema.Types.ObjectId, ref: "BlogPost" },
  },
  { timestamps: true }
);

ContentItemSchema.index({ campaign: 1 });
ContentItemSchema.index({ topic: 1 });
ContentItemSchema.index({ type: 1 });
ContentItemSchema.index({ platform: 1 });
ContentItemSchema.index({ status: 1 });
ContentItemSchema.index({ "qualityScores.overall": -1 });

export default mongoose.models.ContentItem ||
  mongoose.model<IContentItem>("ContentItem", ContentItemSchema);
