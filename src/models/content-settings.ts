import mongoose, { Schema, Document } from "mongoose";

export interface IContentSettings extends Document {
  key: string;
  value?: Record<string, unknown>;
  category:
    | "general"
    | "publishing"
    | "approval"
    | "research"
    | "seo"
    | "brand"
    | "channels"
    | "schedule";
  description?: string;
  updatedAt: Date;
  createdAt: Date;
}

const ContentSettingsSchema = new Schema<IContentSettings>(
  {
    key: { type: String, required: true },
    value: { type: Schema.Types.Mixed },
    category: {
      type: String,
      enum: [
        "general",
        "publishing",
        "approval",
        "research",
        "seo",
        "brand",
        "channels",
        "schedule",
      ],
      required: true,
    },
    description: String,
  },
  { timestamps: true }
);

ContentSettingsSchema.index({ key: 1, category: 1 }, { unique: true });

export default mongoose.models.ContentSettings ||
  mongoose.model<IContentSettings>("ContentSettings", ContentSettingsSchema);
