import mongoose, { Schema, Document } from "mongoose";

export interface IBilling extends Document {
  user: mongoose.Types.ObjectId;
  type: "subscription" | "one-time" | "recurring";
  amount: number;
  currency: string;
  status: "pending" | "paid" | "failed" | "refunded";
  description: string;
  paymentMethod?: string;
  paymentReference?: string;
  billingCycle?: "monthly" | "quarterly" | "yearly";
  nextBillingDate?: Date;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

const BillingSchema = new Schema<IBilling>(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    type: { type: String, enum: ["subscription", "one-time", "recurring"], required: true },
    amount: { type: Number, required: true, min: 0 },
    currency: { type: String, default: "USD" },
    status: {
      type: String,
      enum: ["pending", "paid", "failed", "refunded"],
      default: "pending",
    },
    description: { type: String, required: true },
    paymentMethod: String,
    paymentReference: String,
    billingCycle: { type: String, enum: ["monthly", "quarterly", "yearly"] },
    nextBillingDate: Date,
    metadata: { type: Schema.Types.Mixed },
  },
  { timestamps: true }
);

BillingSchema.index({ user: 1 });
BillingSchema.index({ status: 1 });

export default mongoose.models.Billing ||
  mongoose.model<IBilling>("Billing", BillingSchema);
