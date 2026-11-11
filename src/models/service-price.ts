import mongoose, { Schema, Document } from "mongoose";

export interface IServicePrice extends Document {
  serviceKey: string;
  name: string;
  category: "development" | "hosting" | "domains" | "marketing" | "design" | "ai-automation" | "consulting" | "other";
  description: string;
  type: "fixed" | "hourly" | "starting-at" | "tiered";
  basePrice: number;
  currency: string;
  hourlyRate?: number;
  tiers?: {
    name: string;
    price: number;
    features: string[];
  }[];
  features: string[];
  technology: string[];
  estimatedHours?: { min: number; max: number };
  estimatedWeeks?: { min: number; max: number };
  active: boolean;
  displayOrder: number;
  agentVisible: boolean;
  agentDescription?: string;
  updatedAt: Date;
  createdAt: Date;
}

const ServicePriceSchema = new Schema<IServicePrice>(
  {
    serviceKey: { type: String, required: true, unique: true, lowercase: true, trim: true },
    name: { type: String, required: true, trim: true },
    category: {
      type: String,
      required: true,
      enum: ["development", "hosting", "domains", "marketing", "design", "ai-automation", "consulting", "other"],
    },
    description: { type: String, default: "" },
    type: {
      type: String,
      required: true,
      enum: ["fixed", "hourly", "starting-at", "tiered"],
      default: "starting-at",
    },
    basePrice: { type: Number, required: true, min: 0 },
    currency: { type: String, default: "USD" },
    hourlyRate: { type: Number, min: 0 },
    tiers: [
      {
        name: { type: String, required: true },
        price: { type: Number, required: true, min: 0 },
        features: [String],
      },
    ],
    features: [String],
    technology: [String],
    estimatedHours: {
      min: { type: Number },
      max: { type: Number },
    },
    estimatedWeeks: {
      min: { type: Number },
      max: { type: Number },
    },
    active: { type: Boolean, default: true },
    displayOrder: { type: Number, default: 0 },
    agentVisible: { type: Boolean, default: true },
    agentDescription: { type: String },
  },
  { timestamps: true }
);

ServicePriceSchema.index({ serviceKey: 1 });
ServicePriceSchema.index({ category: 1 });
ServicePriceSchema.index({ active: 1 });

export default mongoose.models.ServicePrice ||
  mongoose.model<IServicePrice>("ServicePrice", ServicePriceSchema);
