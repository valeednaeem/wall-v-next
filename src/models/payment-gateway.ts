import mongoose, { Schema, Document } from "mongoose";

export interface IPaymentGateway extends Document {
  name: string;
  slug: string;
  displayName: string;
  description: string;
  enabled: boolean;
  testMode: boolean;
  credentials: Record<string, string>;
  config: {
    merchantCode?: string;
    secretKey?: string;
    buyLinkSecret?: string;
    ipnSecret?: string;
    hashAlgorithm?: "SHA256" | "SHA3";
    currency?: string;
    returnUrl?: string;
    cancelUrl?: string;
    webhookUrl?: string;
    checkoutType?: "buy-link" | "hosted-checkout" | "overlay";
    allowMultipleCurrencies?: boolean;
    supportedCurrencies?: string[];
  };
  status: "not-configured" | "configured" | "testing" | "test-passed" | "test-failed" | "production";
  lastTestedAt?: Date;
  lastTestResult?: { success: boolean; message: string; timestamp: Date };
  stats: {
    totalTransactions: number;
    successfulPayments: number;
    failedPayments: number;
    totalRevenue: number;
    totalRefunds: number;
    lastPaymentAt?: Date;
  };
  createdAt: Date;
  updatedAt: Date;
}

const PaymentGatewaySchema = new Schema<IPaymentGateway>(
  {
    name: { type: String, required: true, unique: true, lowercase: true },
    slug: { type: String, required: true, unique: true, lowercase: true },
    displayName: { type: String, required: true },
    description: { type: String, default: "" },
    enabled: { type: Boolean, default: false },
    testMode: { type: Boolean, default: true },
    credentials: { type: Schema.Types.Mixed, default: {} },
    config: {
      merchantCode: String,
      secretKey: String,
      buyLinkSecret: String,
      ipnSecret: String,
      hashAlgorithm: { type: String, enum: ["SHA256", "SHA3"], default: "SHA256" },
      currency: { type: String, default: "USD" },
      returnUrl: String,
      cancelUrl: String,
      webhookUrl: String,
      checkoutType: { type: String, enum: ["buy-link", "hosted-checkout", "overlay"], default: "buy-link" },
      allowMultipleCurrencies: { type: Boolean, default: false },
      supportedCurrencies: [String],
    },
    status: { type: String, enum: ["not-configured", "configured", "testing", "test-passed", "test-failed", "production"], default: "not-configured" },
    lastTestedAt: Date,
    lastTestResult: {
      success: Boolean,
      message: String,
      timestamp: Date,
    },
    stats: {
      totalTransactions: { type: Number, default: 0 },
      successfulPayments: { type: Number, default: 0 },
      failedPayments: { type: Number, default: 0 },
      totalRevenue: { type: Number, default: 0 },
      totalRefunds: { type: Number, default: 0 },
      lastPaymentAt: Date,
    },
  },
  { timestamps: true }
);

PaymentGatewaySchema.index({ slug: 1 });
PaymentGatewaySchema.index({ enabled: 1 });

export default mongoose.models.PaymentGateway ||
  mongoose.model<IPaymentGateway>("PaymentGateway", PaymentGatewaySchema);
