import mongoose, { Schema, Document } from "mongoose";

export interface IRobotsSettings extends Document {
  defaultDirectives: Array<{
    userAgent: string;
    allow: string[];
    disallow: string[];
  }>;
  additionalAllowed: string[];
  additionalBlocked: string[];
  sitemapUrl: string;
  hostDirective?: string;
  crawlDelay?: number;
  updatedAt: Date;
  createdAt: Date;
}

const RobotsSettingsSchema = new Schema<IRobotsSettings>(
  {
    defaultDirectives: [
      {
        userAgent: { type: String, default: "*" },
        allow: [{ type: String }],
        disallow: [{ type: String }],
      },
    ],
    additionalAllowed: [{ type: String }],
    additionalBlocked: [{ type: String }],
    sitemapUrl: { type: String, default: "" },
    hostDirective: String,
    crawlDelay: Number,
  },
  { timestamps: true }
);

export default mongoose.models.RobotsSettings ||
  mongoose.model<IRobotsSettings>("RobotsSettings", RobotsSettingsSchema);