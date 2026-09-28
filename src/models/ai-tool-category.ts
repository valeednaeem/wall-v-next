import mongoose, { Schema, Document } from "mongoose";

export interface IAIToolCategory extends Document {
  name: string;
  slug: string;
  description?: string;
  icon?: string;
  image?: string;
  seo?: { metaTitle?: string; metaDescription?: string };
  sortOrder: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const AIToolCategorySchema = new Schema<IAIToolCategory>(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true },
    description: { type: String, trim: true },
    icon: { type: String },
    image: { type: String },
    seo: {
      metaTitle: { type: String },
      metaDescription: { type: String },
    },
    sortOrder: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

AIToolCategorySchema.index({ isActive: 1, sortOrder: 1 });

export default mongoose.models.AIToolCategory ||
  mongoose.model<IAIToolCategory>("AIToolCategory", AIToolCategorySchema);
