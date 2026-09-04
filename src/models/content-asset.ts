import mongoose, { Schema, Document } from "mongoose";

export interface IContentAsset extends Document {
  contentItem: mongoose.Types.ObjectId;
  type:
    | "hero_image"
    | "section_image"
    | "diagram"
    | "social_thumbnail"
    | "video_thumbnail"
    | "carousel_frame";
  platform?: string;
  url?: string;
  prompt?: string;
  altText?: string;
  title?: string;
  caption?: string;
  width?: number;
  height?: number;
  format?: string;
  source: "generated" | "uploaded" | "stock";
  generationModel?: string;
  status: "pending" | "generating" | "completed" | "failed";
  error?: string;
  createdAt: Date;
  updatedAt: Date;
}

const ContentAssetSchema = new Schema<IContentAsset>(
  {
    contentItem: {
      type: Schema.Types.ObjectId,
      ref: "ContentItem",
      required: true,
    },
    type: {
      type: String,
      enum: [
        "hero_image",
        "section_image",
        "diagram",
        "social_thumbnail",
        "video_thumbnail",
        "carousel_frame",
      ],
      required: true,
    },
    platform: String,
    url: String,
    prompt: String,
    altText: String,
    title: String,
    caption: String,
    width: Number,
    height: Number,
    format: String,
    source: {
      type: String,
      enum: ["generated", "uploaded", "stock"],
      default: "generated",
    },
    generationModel: String,
    status: {
      type: String,
      enum: ["pending", "generating", "completed", "failed"],
      default: "pending",
    },
    error: String,
  },
  { timestamps: true }
);

ContentAssetSchema.index({ contentItem: 1 });
ContentAssetSchema.index({ type: 1 });
ContentAssetSchema.index({ status: 1 });

export default mongoose.models.ContentAsset ||
  mongoose.model<IContentAsset>("ContentAsset", ContentAssetSchema);
