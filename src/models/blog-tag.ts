import mongoose, { Schema, Document } from "mongoose";

export interface IBlogTag extends Document {
  name: string;
  slug: string;
  postCount: number;
  createdAt: Date;
  updatedAt: Date;
}

const BlogTagSchema = new Schema<IBlogTag>(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true },
    postCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export default mongoose.models.BlogTag ||
  mongoose.model<IBlogTag>("BlogTag", BlogTagSchema);
