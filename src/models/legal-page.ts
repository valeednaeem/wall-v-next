import mongoose, { Schema, Document } from "mongoose";

export interface ILegalPage extends Document {
  title: string;
  slug: string;
  content: string;
  type: string;
  version: string;
  status: "draft" | "published" | "scheduled";
  scheduledAt?: Date;
  isActive: boolean;
  language: string;
  brand?: string;
  seo: {
    metaTitle?: string;
    metaDescription?: string;
    canonicalUrl?: string;
    robots?: string;
    ogImage?: string;
    ogTitle?: string;
    ogDescription?: string;
    twitterCard?: string;
    twitterTitle?: string;
    twitterDescription?: string;
    schema?: Record<string, unknown>;
  };
  author?: mongoose.Types.ObjectId;
  lastPublishedAt?: Date;
  changeNote?: string;
  createdAt: Date;
  updatedAt: Date;
}

const LegalPageSchema = new Schema<ILegalPage>(
  {
    title: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true },
    content: { type: String, required: true },
    type: {
      type: String,
      enum: [
        "privacy", "terms", "refund", "cookie", "disclaimer",
        "sitemap", "accessibility", "acceptable-use", "ai-usage",
        "data-processing", "copyright", "contact-legal", "other",
      ],
      required: true,
    },
    version: { type: String, default: "1.0" },
    status: { type: String, enum: ["draft", "published", "scheduled"], default: "draft" },
    scheduledAt: Date,
    isActive: { type: Boolean, default: true },
    language: { type: String, default: "en" },
    brand: String,
    seo: {
      metaTitle: String,
      metaDescription: String,
      canonicalUrl: String,
      robots: { type: String, default: "index, follow" },
      ogImage: String,
      ogTitle: String,
      ogDescription: String,
      twitterCard: { type: String, default: "summary_large_image" },
      twitterTitle: String,
      twitterDescription: String,
      schema: Schema.Types.Mixed,
    },
    author: { type: Schema.Types.ObjectId, ref: "User" },
    lastPublishedAt: Date,
    changeNote: String,
  },
  { timestamps: true }
);

LegalPageSchema.index({ slug: 1 });
LegalPageSchema.index({ type: 1 });
LegalPageSchema.index({ status: 1 });
LegalPageSchema.index({ isActive: 1 });

export default mongoose.models.LegalPage ||
  mongoose.model<ILegalPage>("LegalPage", LegalPageSchema);
