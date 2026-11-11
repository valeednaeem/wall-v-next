import mongoose, { Schema, Document } from "mongoose";

export interface IBlogSeries extends Document {
  title: string;
  slug: string;
  description?: string;
  image?: string;
  posts: mongoose.Types.ObjectId[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const BlogSeriesSchema = new Schema<IBlogSeries>(
  {
    title: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true },
    description: String,
    image: String,
    posts: [{ type: Schema.Types.ObjectId, ref: "BlogPost" }],
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export default mongoose.models.BlogSeries ||
  mongoose.model<IBlogSeries>("BlogSeries", BlogSeriesSchema);
