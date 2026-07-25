import mongoose, { Schema, Document } from "mongoose";

export interface IBlogComment extends Document {
  post: mongoose.Types.ObjectId;
  user?: mongoose.Types.ObjectId;
  author: string;
  email: string;
  content: string;
  status: "pending" | "approved" | "rejected" | "spam";
  parent?: mongoose.Types.ObjectId;
  likes: number;
  createdAt: Date;
  updatedAt: Date;
}

const BlogCommentSchema = new Schema<IBlogComment>(
  {
    post: { type: Schema.Types.ObjectId, ref: "BlogPost", required: true },
    user: { type: Schema.Types.ObjectId, ref: "User" },
    author: { type: String, required: true },
    email: { type: String, required: true, lowercase: true },
    content: { type: String, required: true },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected", "spam"],
      default: "pending",
    },
    parent: { type: Schema.Types.ObjectId, ref: "BlogComment" },
    likes: { type: Number, default: 0 },
  },
  { timestamps: true }
);

BlogCommentSchema.index({ post: 1 });
BlogCommentSchema.index({ status: 1 });

export default mongoose.models.BlogComment ||
  mongoose.model<IBlogComment>("BlogComment", BlogCommentSchema);
