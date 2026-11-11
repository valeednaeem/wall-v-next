import mongoose, { Schema, Document } from "mongoose";

export interface IProviderModel {
  name: string;
  label?: string;
  enabled: boolean;
  inputCostPer1k?: number;
  outputCostPer1k?: number;
  maxTokens?: number;
}

export interface IAIToolProvider extends Document {
  name: string;
  slug: string;
  type: "openai" | "anthropic" | "google" | "elevenlabs" | "omnirouter" | "custom";
  status: "active" | "inactive";
  isDefault: boolean;
  envKeyName?: string;
  models: IProviderModel[];
  rateLimit?: { requestsPerMinute?: number };
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const AIToolProviderSchema = new Schema<IAIToolProvider>(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true },
    type: {
      type: String,
      required: true,
      enum: ["openai", "anthropic", "google", "elevenlabs", "omnirouter", "custom"],
    },
    status: { type: String, enum: ["active", "inactive"], default: "active" },
    isDefault: { type: Boolean, default: false },
    envKeyName: { type: String },
    models: [
      {
        name: { type: String, required: true },
        label: { type: String },
        enabled: { type: Boolean, default: true },
        inputCostPer1k: { type: Number, min: 0 },
        outputCostPer1k: { type: Number, min: 0 },
        maxTokens: { type: Number, min: 0 },
      },
    ],
    rateLimit: { requestsPerMinute: { type: Number, min: 0 } },
    notes: { type: String },
  },
  { timestamps: true }
);

AIToolProviderSchema.index({ status: 1 });

export default mongoose.models.AIToolProvider ||
  mongoose.model<IAIToolProvider>("AIToolProvider", AIToolProviderSchema);
