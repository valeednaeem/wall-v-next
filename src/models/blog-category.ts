import mongoose, { Schema, Document } from "mongoose";

export interface IBlogCategory extends Document {
  name: string;
  slug: string;
  description?: string;
  image?: string;
  parent?: mongoose.Types.ObjectId;
  postCount: number;
  sortOrder: number;
  isActive: boolean;
  seo?: {
    metaTitle?: string;
    metaDescription?: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

const BlogCategorySchema = new Schema<IBlogCategory>(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true },
    description: String,
    image: String,
    parent: { type: Schema.Types.ObjectId, ref: "BlogCategory" },
    postCount: { type: Number, default: 0 },
    sortOrder: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
    seo: {
      metaTitle: String,
      metaDescription: String,
    },
  },
  { timestamps: true }
);

export default mongoose.models.BlogCategory ||
  mongoose.model<IBlogCategory>("BlogCategory", BlogCategorySchema);
