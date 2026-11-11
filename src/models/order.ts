import mongoose, { Schema, Document } from "mongoose";

export interface IOrderItem {
  product: mongoose.Types.ObjectId;
  name: string;
  slug: string;
  price: number;
  quantity: number;
  image?: string;
  variant?: string;
}

export interface IOrder extends Document {
  orderNumber: string;
  user?: mongoose.Types.ObjectId;
  guestEmail?: string;
  items: IOrderItem[];
  subtotal: number;
  tax: number;
  taxRate: number;
  discount: number;
  total: number;
  currency: string;
  status: "pending" | "confirmed" | "processing" | "completed" | "cancelled" | "refunded";
  paymentStatus: "unpaid" | "paid" | "failed" | "refunded";
  paymentMethod: "stripe" | "paypal" | "2checkout" | "manual";
  paymentReference?: string;
  billingAddress: {
    name?: string;
    email?: string;
    phone?: string;
    street?: string;
    city?: string;
    state?: string;
    country?: string;
    zip?: string;
  };
  shippingAddress?: {
    name?: string;
    street?: string;
    city?: string;
    state?: string;
    country?: string;
    zip?: string;
  };
  notes?: string;
  downloadCount: number;
  downloads: {
    file: string;
    name: string;
    downloadedAt: Date;
  }[];
  createdAt: Date;
  updatedAt: Date;
}

const OrderSchema = new Schema<IOrder>(
  {
    orderNumber: { type: String, required: true, unique: true },
    user: { type: Schema.Types.ObjectId, ref: "User" },
    guestEmail: { type: String, lowercase: true, trim: true },
    items: [
      {
        product: { type: Schema.Types.ObjectId, ref: "Product", required: true },
        name: { type: String, required: true },
        slug: { type: String, required: true },
        price: { type: Number, required: true },
        quantity: { type: Number, required: true, min: 1 },
        image: String,
        variant: String,
      },
    ],
    subtotal: { type: Number, required: true },
    tax: { type: Number, default: 0 },
    taxRate: { type: Number, default: 0 },
    discount: { type: Number, default: 0 },
    total: { type: Number, required: true },
    currency: { type: String, default: "USD" },
    status: {
      type: String,
      enum: ["pending", "confirmed", "processing", "completed", "cancelled", "refunded"],
      default: "pending",
    },
    paymentStatus: {
      type: String,
      enum: ["unpaid", "paid", "failed", "refunded"],
      default: "unpaid",
    },
    paymentMethod: {
      type: String,
      enum: ["stripe", "paypal", "manual"],
      default: "stripe",
    },
    paymentReference: String,
    billingAddress: {
      name: String,
      email: String,
      phone: String,
      street: String,
      city: String,
      state: String,
      country: String,
      zip: String,
    },
    shippingAddress: {
      name: String,
      street: String,
      city: String,
      state: String,
      country: String,
      zip: String,
    },
    notes: String,
    downloadCount: { type: Number, default: 0 },
    downloads: [
      {
        file: String,
        name: String,
        downloadedAt: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true }
);

OrderSchema.index({ orderNumber: 1 });
OrderSchema.index({ user: 1 });
OrderSchema.index({ status: 1 });
OrderSchema.index({ paymentStatus: 1 });
OrderSchema.index({ createdAt: -1 });

export default mongoose.models.Order || mongoose.model<IOrder>("Order", OrderSchema);
