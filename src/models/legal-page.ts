import mongoose, { Schema, Document } from "mongoose";

export interface ILegalPage extends Document {
  title: string;
  slug: string;
  content: string;
  type: "privacy" | "terms" | "refund" | "cookie" | "gdpr" | "other";
  version: string;
  isActive: boolean;
  seo?: {
    metaTitle?: string;
    metaDescription?: string;
  };
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
      enum: ["privacy", "terms", "refund", "cookie", "gdpr", "other"],
      required: true,
    },
    version: { type: String, default: "1.0" },
    isActive: { type: Boolean, default: true },
    seo: {
      metaTitle: String,
      metaDescription: String,
    },
  },
  { timestamps: true }
);

LegalPageSchema.index({ slug: 1 });
LegalPageSchema.index({ type: 1 });

export default mongoose.models.LegalPage ||
  mongoose.model<ILegalPage>("LegalPage", LegalPageSchema);
