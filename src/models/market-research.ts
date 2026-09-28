import mongoose, { Schema, Document } from "mongoose";

export interface IMarketResearch extends Document {
  competitor: string;
  product: string;
  category?: string;
  url?: string;
  pricing?: string;
  features?: string[];
  targetAudience?: string;
  positioning?: string;
  notes?: string;
  researchedAt: Date;
  createdBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const MarketResearchSchema = new Schema<IMarketResearch>(
  {
    competitor: { type: String, required: true, trim: true },
    product: { type: String, required: true, trim: true },
    category: { type: String, trim: true },
    url: { type: String, trim: true },
    pricing: { type: String, trim: true },
    features: [{ type: String }],
    targetAudience: { type: String },
    positioning: { type: String },
    notes: { type: String },
    researchedAt: { type: Date, default: Date.now },
    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

MarketResearchSchema.index({ category: 1 });
MarketResearchSchema.index({ researchedAt: -1 });

export default mongoose.models.MarketResearch ||
  mongoose.model<IMarketResearch>("MarketResearch", MarketResearchSchema);
