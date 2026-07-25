import mongoose, { Schema, Document } from "mongoose";

export interface IBlogPost extends Document {
  title: string;
  slug: string;
  content: string;
  excerpt?: string;
  featuredImage?: string;
  gallery: string[];
  author: mongoose.Types.ObjectId;
  category: mongoose.Types.ObjectId;
  tags: mongoose.Types.ObjectId[];
  status: "draft" | "published" | "scheduled" | "archived";
  publishedAt?: Date;
  scheduledAt?: Date;
  isFeatured: boolean;
  viewCount: number;
  likeCount: number;
  commentCount: number;
  readTime: number;
  seo?: {
    metaTitle?: string;
    metaDescription?: string;
    keywords?: string[];
  };
  social?: {
    ogImage?: string;
    twitterHandle?: string;
  };
  relatedPosts: mongoose.Types.ObjectId[];
  revisions: {
    content: string;
    revisedAt: Date;
    revisedBy: mongoose.Types.ObjectId;
  }[];
  createdBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const BlogPostSchema = new Schema<IBlogPost>(
  {
    title: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true },
    content: { type: String, required: true },
    excerpt: String,
    featuredImage: String,
    gallery: [String],
    author: { type: Schema.Types.ObjectId, ref: "User", required: true },
    category: { type: Schema.Types.ObjectId, ref: "BlogCategory", required: true },
    tags: [{ type: Schema.Types.ObjectId, ref: "BlogTag" }],
    status: {
      type: String,
      enum: ["draft", "published", "scheduled", "archived"],
      default: "draft",
    },
    publishedAt: Date,
    scheduledAt: Date,
    isFeatured: { type: Boolean, default: false },
    viewCount: { type: Number, default: 0 },
    likeCount: { type: Number, default: 0 },
    commentCount: { type: Number, default: 0 },
    readTime: { type: Number, default: 0 },
    seo: {
      metaTitle: String,
      metaDescription: String,
      keywords: [String],
    },
    social: {
      ogImage: String,
      twitterHandle: String,
    },
    relatedPosts: [{ type: Schema.Types.ObjectId, ref: "BlogPost" }],
    revisions: [
      {
        content: String,
        revisedAt: Date,
        revisedBy: { type: Schema.Types.ObjectId, ref: "User" },
      },
    ],
    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

BlogPostSchema.index({ slug: 1 });
BlogPostSchema.index({ status: 1 });
BlogPostSchema.index({ category: 1 });
BlogPostSchema.index({ tags: 1 });
BlogPostSchema.index({ author: 1 });

export default mongoose.models.BlogPost ||
  mongoose.model<IBlogPost>("BlogPost", BlogPostSchema);
