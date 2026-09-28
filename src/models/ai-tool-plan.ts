import mongoose, { Schema, Document } from "mongoose";

export interface IAIToolPlan extends Document {
  name: string;
  slug: string;
  description?: string;
  monthlyPrice: number;
  yearlyPrice: number;
  includedCredits: number;
  includedExecutions: number;
  features: string[];
  status: "active" | "inactive";
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

const AIToolPlanSchema = new Schema<IAIToolPlan>(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true },
    description: { type: String },
    monthlyPrice: { type: Number, required: true, min: 0 },
    yearlyPrice: { type: Number, required: true, min: 0 },
    includedCredits: { type: Number, default: 0, min: 0 },
    includedExecutions: { type: Number, default: 0, min: 0 },
    features: [{ type: String }],
    status: { type: String, enum: ["active", "inactive"], default: "active" },
    sortOrder: { type: Number, default: 0 },
  },
  { timestamps: true }
);

AIToolPlanSchema.index({ status: 1 });

export default mongoose.models.AIToolPlan ||
  mongoose.model<IAIToolPlan>("AIToolPlan", AIToolPlanSchema);
