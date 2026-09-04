import mongoose, { Schema, Document } from "mongoose";

export interface IContentTopic extends Document {
  campaign: mongoose.Types.ObjectId;
  title: string;
  slug: string;
  description?: string;
  primaryKeyword?: string;
  secondaryKeywords: string[];
  searchIntent: "informational" | "navigational" | "commercial" | "transactional";
  contentType:
    | "how-to"
    | "guide"
    | "comparison"
    | "tutorial"
    | "case-study"
    | "trend-analysis"
    | "deep-dive"
    | "checklist"
    | "faq"
    | "product-guide"
    | "service-guide"
    | "beginner-guide"
    | "mistakes-to-avoid"
    | "future-trends";
  audience?: string;
  businessRelevance: number;
  productServiceRelevance: {
    type: "product" | "service" | "hosting";
    name: string;
    slug: string;
  }[];
  trendMomentum: number;
  seoOpportunity: number;
  competition: number;
  conversionPotential: number;
  socialPotential: number;
  videoPotential: number;
  contentDifferentiation: number;
  factualUncertainty: number;
  saturation: number;
  overallScore: number;
  sources: {
    title: string;
    url: string;
    publishedAt?: Date;
    snippet?: string;
  }[];
  competitorAngles: string[];
  status:
    | "discovered"
    | "scored"
    | "selected"
    | "rejected"
    | "planned"
    | "in_progress"
    | "completed";
  assignedDate?: Date;
  assignedDayOfWeek?: number;
  cta?: string;
  plannedChannels: string[];
  plannedMedia: {
    image: boolean;
    video: boolean;
    social: boolean;
  };
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const ContentTopicSchema = new Schema<IContentTopic>(
  {
    campaign: {
      type: Schema.Types.ObjectId,
      ref: "ContentCampaign",
      required: true,
    },
    title: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true },
    description: String,
    primaryKeyword: String,
    secondaryKeywords: [String],
    searchIntent: {
      type: String,
      enum: ["informational", "navigational", "commercial", "transactional"],
    },
    contentType: {
      type: String,
      enum: [
        "how-to",
        "guide",
        "comparison",
        "tutorial",
        "case-study",
        "trend-analysis",
        "deep-dive",
        "checklist",
        "faq",
        "product-guide",
        "service-guide",
        "beginner-guide",
        "mistakes-to-avoid",
        "future-trends",
      ],
    },
    audience: String,
    businessRelevance: { type: Number, min: 1, max: 10, default: 5 },
    productServiceRelevance: [
      {
        type: {
          type: String,
          enum: ["product", "service", "hosting"],
          required: true,
        },
        name: { type: String, required: true },
        slug: { type: String, required: true },
      },
    ],
    trendMomentum: { type: Number, min: 1, max: 10, default: 5 },
    seoOpportunity: { type: Number, min: 1, max: 10, default: 5 },
    competition: { type: Number, min: 1, max: 10, default: 5 },
    conversionPotential: { type: Number, min: 1, max: 10, default: 5 },
    socialPotential: { type: Number, min: 1, max: 10, default: 5 },
    videoPotential: { type: Number, min: 1, max: 10, default: 5 },
    contentDifferentiation: { type: Number, min: 1, max: 10, default: 5 },
    factualUncertainty: { type: Number, min: 1, max: 10, default: 5 },
    saturation: { type: Number, min: 1, max: 10, default: 5 },
    overallScore: { type: Number, default: 0 },
    sources: [
      {
        title: String,
        url: String,
        publishedAt: Date,
        snippet: String,
      },
    ],
    competitorAngles: [String],
    status: {
      type: String,
      enum: [
        "discovered",
        "scored",
        "selected",
        "rejected",
        "planned",
        "in_progress",
        "completed",
      ],
      default: "discovered",
    },
    assignedDate: Date,
    assignedDayOfWeek: { type: Number, min: 0, max: 6 },
    cta: String,
    plannedChannels: [String],
    plannedMedia: {
      image: { type: Boolean, default: false },
      video: { type: Boolean, default: false },
      social: { type: Boolean, default: false },
    },
    notes: String,
  },
  { timestamps: true }
);

ContentTopicSchema.index({ campaign: 1 });
ContentTopicSchema.index({ status: 1 });
ContentTopicSchema.index({ overallScore: -1 });
ContentTopicSchema.index({ primaryKeyword: 1 });

export default mongoose.models.ContentTopic ||
  mongoose.model<IContentTopic>("ContentTopic", ContentTopicSchema);
