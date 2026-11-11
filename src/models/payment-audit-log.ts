import mongoose, { Schema, Document } from "mongoose";

export interface IPaymentAuditLog extends Document {
  action: string;
  entity: string;
  entityId: mongoose.Types.ObjectId;
  user?: mongoose.Types.ObjectId;
  customer?: mongoose.Types.ObjectId;
  payment?: mongoose.Types.ObjectId;
  invoice?: mongoose.Types.ObjectId;
  order?: mongoose.Types.ObjectId;
  project?: mongoose.Types.ObjectId;
  gateway?: string;
  gatewayTransactionId?: string;
  previousState?: string;
  newState?: string;
  amount?: number;
  currency?: string;
  details?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  timestamp: Date;
}

const PaymentAuditLogSchema = new Schema<IPaymentAuditLog>(
  {
    action: { type: String, required: true },
    entity: { type: String, required: true },
    entityId: { type: Schema.Types.ObjectId, required: true },
    user: { type: Schema.Types.ObjectId, ref: "User" },
    customer: { type: Schema.Types.ObjectId, ref: "User" },
    payment: { type: Schema.Types.ObjectId, ref: "Payment" },
    invoice: { type: Schema.Types.ObjectId, ref: "Invoice" },
    order: { type: Schema.Types.ObjectId, ref: "Order" },
    project: { type: Schema.Types.ObjectId, ref: "Project" },
    gateway: String,
    gatewayTransactionId: String,
    previousState: String,
    newState: String,
    amount: Number,
    currency: String,
    details: { type: Schema.Types.Mixed },
    ipAddress: String,
    userAgent: String,
    timestamp: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

PaymentAuditLogSchema.index({ entity: 1, entityId: 1 });
PaymentAuditLogSchema.index({ payment: 1 });
PaymentAuditLogSchema.index({ action: 1 });
PaymentAuditLogSchema.index({ timestamp: -1 });

export default mongoose.models.PaymentAuditLog ||
  mongoose.model<IPaymentAuditLog>("PaymentAuditLog", PaymentAuditLogSchema);
