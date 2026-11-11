import mongoose, { Schema, Document } from "mongoose";

export interface IProjectPayment extends Document {
  project: mongoose.Types.ObjectId;
  invoice?: mongoose.Types.ObjectId;
  quotation?: mongoose.Types.ObjectId;
  amount: number;
  currency: string;
  type: "deposit" | "milestone" | "partial" | "final" | "maintenance" | "other";
  status: "pending" | "processing" | "completed" | "failed" | "refunded";
  method?: "stripe" | "paypal" | "bank-transfer" | "manual" | "2checkout";
  reference?: string;
  transactionId?: string;
  paidAt?: Date;
  refundedAt?: Date;
  refundAmount?: number;
  refundReason?: string;
  notes?: string;
  recordedBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const ProjectPaymentSchema = new Schema<IProjectPayment>(
  {
    project: { type: Schema.Types.ObjectId, ref: "Project", required: true },
    invoice: { type: Schema.Types.ObjectId, ref: "Invoice" },
    quotation: { type: Schema.Types.ObjectId, ref: "Quote" },
    amount: { type: Number, required: true, min: 0 },
    currency: { type: String, default: "USD" },
    type: { type: String, enum: ["deposit", "milestone", "partial", "final", "maintenance", "other"], default: "partial" },
    status: { type: String, enum: ["pending", "processing", "completed", "failed", "refunded"], default: "pending" },
    method: { type: String, enum: ["stripe", "paypal", "bank-transfer", "manual", "2checkout"] },
    reference: String,
    transactionId: String,
    paidAt: Date,
    refundedAt: Date,
    refundAmount: Number,
    refundReason: String,
    notes: String,
    recordedBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

ProjectPaymentSchema.index({ project: 1 });
ProjectPaymentSchema.index({ invoice: 1 });
ProjectPaymentSchema.index({ status: 1 });

export default mongoose.models.ProjectPayment ||
  mongoose.model<IProjectPayment>("ProjectPayment", ProjectPaymentSchema);
