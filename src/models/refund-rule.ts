import mongoose, { Schema, Document } from "mongoose";

export interface IRefundRule extends Document {
  name: string;
  slug: string;
  description: string;
  serviceType: string;
  refundWindowDays: number;
  refundPercentage: number;
  conditions: string[];
  isEligible: boolean;
  requiresApproval: boolean;
  refundMethod: "original-payment" | "store-credit" | "bank-transfer" | "none";
  processingDays: number;
  excludedItems: string[];
  notes?: string;
  isActive: boolean;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

const RefundRuleSchema = new Schema<IRefundRule>(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true },
    description: { type: String, required: true },
    serviceType: { type: String, required: true },
    refundWindowDays: { type: Number, required: true, min: 0 },
    refundPercentage: { type: Number, required: true, min: 0, max: 100 },
    conditions: [{ type: String }],
    isEligible: { type: Boolean, default: true },
    requiresApproval: { type: Boolean, default: false },
    refundMethod: {
      type: String,
      enum: ["original-payment", "store-credit", "bank-transfer", "none"],
      default: "original-payment",
    },
    processingDays: { type: Number, default: 14 },
    excludedItems: [{ type: String }],
    notes: String,
    isActive: { type: Boolean, default: true },
    sortOrder: { type: Number, default: 0 },
  },
  { timestamps: true }
);

RefundRuleSchema.index({ slug: 1 });
RefundRuleSchema.index({ serviceType: 1 });
RefundRuleSchema.index({ isActive: 1 });

export default mongoose.models.RefundRule ||
  mongoose.model<IRefundRule>("RefundRule", RefundRuleSchema);
