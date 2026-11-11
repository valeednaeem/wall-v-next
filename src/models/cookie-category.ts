import mongoose, { Schema, Document } from "mongoose";

export interface ICookieCategory extends Document {
  name: string;
  slug: string;
  description: string;
  isRequired: boolean;
  defaultEnabled: boolean;
  sortOrder: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const CookieCategorySchema = new Schema<ICookieCategory>(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true },
    description: { type: String, required: true },
    isRequired: { type: Boolean, default: false },
    defaultEnabled: { type: Boolean, default: false },
    sortOrder: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

CookieCategorySchema.index({ slug: 1 });
CookieCategorySchema.index({ sortOrder: 1 });

export default mongoose.models.CookieCategory ||
  mongoose.model<ICookieCategory>("CookieCategory", CookieCategorySchema);
