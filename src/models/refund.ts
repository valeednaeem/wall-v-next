import mongoose, { Schema, Document } from "mongoose";

export interface IRefund extends Document {
  refundNumber: string;
  payment: mongoose.Types.ObjectId;
  customer?: mongoose.Types.ObjectId;
  customerEmail: string;
  amount: number;
  currency: string;
  reason: string;
  description?: string;
  status: "pending" | "approved" | "processing" | "completed" | "rejected" | "failed";
  gatewayRefundId?: string;
  gatewayResponse?: Record<string, unknown>;
  requestedBy?: mongoose.Types.ObjectId;
  approvedBy?: mongoose.Types.ObjectId;
  processedBy?: mongoose.Types.ObjectId;
  approvedAt?: Date;
  processedAt?: Date;
  completedAt?: Date;
  rejectedAt?: Date;
  rejectionReason?: string;
  invoice?: mongoose.Types.ObjectId;
  order?: mongoose.Types.ObjectId;
  project?: mongoose.Types.ObjectId;
  error?: { code?: string; message?: string };
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const RefundSchema = new Schema<IRefund>(
  {
    refundNumber: { type: String, required: true, unique: true },
    payment: { type: Schema.Types.ObjectId, ref: "Payment", required: true },
    customer: { type: Schema.Types.ObjectId, ref: "User" },
    customerEmail: { type: String, required: true },
    amount: { type: Number, required: true },
    currency: { type: String, required: true, default: "USD" },
    reason: { type: String, required: true },
    description: String,
    status: { type: String, enum: ["pending", "approved", "processing", "completed", "rejected", "failed"], default: "pending" },
    gatewayRefundId: String,
    gatewayResponse: { type: Schema.Types.Mixed },
    requestedBy: { type: Schema.Types.ObjectId, ref: "User" },
    approvedBy: { type: Schema.Types.ObjectId, ref: "User" },
    processedBy: { type: Schema.Types.ObjectId, ref: "User" },
    approvedAt: Date,
    processedAt: Date,
    completedAt: Date,
    rejectedAt: Date,
    rejectionReason: String,
    invoice: { type: Schema.Types.ObjectId, ref: "Invoice" },
    order: { type: Schema.Types.ObjectId, ref: "Order" },
    project: { type: Schema.Types.ObjectId, ref: "Project" },
    error: { code: String, message: String },
    notes: String,
  },
  { timestamps: true }
);

RefundSchema.index({ refundNumber: 1 });
RefundSchema.index({ payment: 1 });
RefundSchema.index({ status: 1 });
RefundSchema.index({ createdAt: -1 });

export default mongoose.models.Refund ||
  mongoose.model<IRefund>("Refund", RefundSchema);
