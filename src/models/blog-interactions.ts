import mongoose, { Schema, Document } from "mongoose";

export interface IBlogInteraction extends Document {
  post: mongoose.Types.ObjectId;
  user?: mongoose.Types.ObjectId;
  sessionId?: string;
  type: "like" | "share" | "bookmark";
  createdAt: Date;
}

const BlogInteractionSchema = new Schema<IBlogInteraction>(
  {
    post: { type: Schema.Types.ObjectId, ref: "BlogPost", required: true },
    user: { type: Schema.Types.ObjectId, ref: "User" },
    sessionId: String,
    type: { type: String, enum: ["like", "share", "bookmark"], required: true },
  },
  { timestamps: true }
);

BlogInteractionSchema.index({ post: 1 });
BlogInteractionSchema.index({ user: 1 });
BlogInteractionSchema.index({ type: 1 });

export default mongoose.models.BlogInteraction ||
  mongoose.model<IBlogInteraction>("BlogInteraction", BlogInteractionSchema);
