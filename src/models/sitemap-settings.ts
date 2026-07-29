import mongoose, { Schema, Document } from "mongoose";

export interface ISitemapSettings extends Document {
  includePages: boolean;
  includePosts: boolean;
  includeProducts: boolean;
  includeServices: boolean;
  includeCategories: boolean;
  includeTags: boolean;
  includeLegal: boolean;
  includePortfolio: boolean;
  maxUrlsPerPage: number;
  defaultPriority: number;
  defaultChangeFreq: string;
  customUrls: Array<{
    url: string;
    priority: number;
    changeFreq: string;
    lastMod?: Date;
    isActive: boolean;
  }>;
  excludePatterns: string[];
  lastGenerated?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const SitemapSettingsSchema = new Schema<ISitemapSettings>(
  {
    includePages: { type: Boolean, default: true },
    includePosts: { type: Boolean, default: true },
    includeProducts: { type: Boolean, default: true },
    includeServices: { type: Boolean, default: true },
    includeCategories: { type: Boolean, default: true },
    includeTags: { type: Boolean, default: true },
    includeLegal: { type: Boolean, default: true },
    includePortfolio: { type: Boolean, default: true },
    maxUrlsPerPage: { type: Number, default: 50000 },
    defaultPriority: { type: Number, default: 0.5 },
    defaultChangeFreq: { type: String, default: "weekly" },
    customUrls: [
      {
        url: String,
        priority: Number,
        changeFreq: String,
        lastMod: Date,
        isActive: { type: Boolean, default: true },
      },
    ],
    excludePatterns: [{ type: String }],
    lastGenerated: Date,
  },
  { timestamps: true }
);

export default mongoose.models.SitemapSettings ||
  mongoose.model<ISitemapSettings>("SitemapSettings", SitemapSettingsSchema);
