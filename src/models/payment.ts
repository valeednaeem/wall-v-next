import mongoose, { Schema, Document } from "mongoose";

export interface IPayment extends Document {
  paymentNumber: string;
  internalId: string;
  gatewayId?: mongoose.Types.ObjectId;
  gateway: string;
  gatewayTransactionId?: string;
  gatewayOrderId?: string;
  gatewayReference?: string;
  customer?: mongoose.Types.ObjectId;
  customerEmail: string;
  customerName: string;
  invoice?: mongoose.Types.ObjectId;
  order?: mongoose.Types.ObjectId;
  project?: mongoose.Types.ObjectId;
  quotation?: mongoose.Types.ObjectId;
  items: {
    description: string;
    amount: number;
    type: "product" | "service" | "project-deposit" | "project-milestone" | "project-final" | "subscription" | "renewal" | "upgrade" | "other";
    referenceId?: string;
  }[];
  amount: number;
  currency: string;
  exchangeRate?: number;
  fee?: number;
  netAmount?: number;
  status: "pending" | "processing" | "completed" | "failed" | "cancelled" | "refunded" | "partially-refunded" | "disputed" | "chargeback";
  paymentMethod: string;
  billingAddress?: {
    name?: string;
    company?: string;
    address?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
    phone?: string;
    email?: string;
  };
  gatewayResponse?: Record<string, unknown>;
  gatewayRawEvent?: Record<string, unknown>;
  error?: {
    code?: string;
    message?: string;
    details?: string;
  };
  refund?: {
    amount: number;
    reason?: string;
    gatewayRefundId?: string;
    refundedAt: Date;
    refundedBy?: mongoose.Types.ObjectId;
    status: "pending" | "completed" | "failed";
  };
  subscription?: {
    subscriptionId: string;
    periodStart?: Date;
    periodEnd?: Date;
    interval?: string;
  };
  metadata?: Record<string, unknown>;
  idempotencyKey?: string;
  processedAt?: Date;
  completedAt?: Date;
  failedAt?: Date;
  refundedAt?: Date;
  notes?: string;
  createdBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const PaymentSchema = new Schema<IPayment>(
  {
    paymentNumber: { type: String, required: true, unique: true },
    internalId: { type: String, required: true, unique: true },
    gatewayId: { type: Schema.Types.ObjectId, ref: "PaymentGateway" },
    gateway: { type: String, required: true, default: "2checkout" },
    gatewayTransactionId: { type: String, sparse: true },
    gatewayOrderId: { type: String, sparse: true },
    gatewayReference: { type: String, sparse: true },
    customer: { type: Schema.Types.ObjectId, ref: "User" },
    customerEmail: { type: String, required: true },
    customerName: { type: String, required: true },
    invoice: { type: Schema.Types.ObjectId, ref: "Invoice" },
    order: { type: Schema.Types.ObjectId, ref: "Order" },
    project: { type: Schema.Types.ObjectId, ref: "Project" },
    quotation: { type: Schema.Types.ObjectId, ref: "Quotation" },
    items: [{
      description: { type: String, required: true },
      amount: { type: Number, required: true },
      type: { type: String, enum: ["product", "service", "project-deposit", "project-milestone", "project-final", "subscription", "renewal", "upgrade", "other"], required: true },
      referenceId: String,
    }],
    amount: { type: Number, required: true },
    currency: { type: String, required: true, default: "USD" },
    exchangeRate: { type: Number },
    fee: { type: Number, default: 0 },
    netAmount: { type: Number },
    status: {
      type: String,
      enum: ["pending", "processing", "completed", "failed", "cancelled", "refunded", "partially-refunded", "disputed", "chargeback"],
      default: "pending",
    },
    paymentMethod: { type: String, required: true, default: "2checkout" },
    billingAddress: {
      name: String,
      company: String,
      address: String,
      city: String,
      state: String,
      postalCode: String,
      country: String,
      phone: String,
      email: String,
    },
    gatewayResponse: { type: Schema.Types.Mixed },
    gatewayRawEvent: { type: Schema.Types.Mixed },
    error: {
      code: String,
      message: String,
      details: String,
    },
    refund: {
      amount: Number,
      reason: String,
      gatewayRefundId: String,
      refundedAt: Date,
      refundedBy: { type: Schema.Types.ObjectId, ref: "User" },
      status: { type: String, enum: ["pending", "completed", "failed"] },
    },
    subscription: {
      subscriptionId: String,
      periodStart: Date,
      periodEnd: Date,
      interval: String,
    },
    metadata: { type: Schema.Types.Mixed },
    idempotencyKey: { type: String, sparse: true },
    processedAt: Date,
    completedAt: Date,
    failedAt: Date,
    refundedAt: Date,
    notes: String,
    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

PaymentSchema.index({ paymentNumber: 1 });
PaymentSchema.index({ internalId: 1 });
PaymentSchema.index({ gatewayTransactionId: 1 });
PaymentSchema.index({ gatewayOrderId: 1 });
PaymentSchema.index({ idempotencyKey: 1 }, { unique: true, sparse: true });
PaymentSchema.index({ customer: 1 });
PaymentSchema.index({ invoice: 1 });
PaymentSchema.index({ order: 1 });
PaymentSchema.index({ project: 1 });
PaymentSchema.index({ status: 1 });
PaymentSchema.index({ createdAt: -1 });

export default mongoose.models.Payment ||
  mongoose.model<IPayment>("Payment", PaymentSchema);
