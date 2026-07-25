import mongoose, { Schema, Document } from "mongoose";

export interface IQuote extends Document {
  reference: string;
  client?: mongoose.Types.ObjectId;
  inquiry?: mongoose.Types.ObjectId;
  items: {
    description: string;
    quantity: number;
    unitPrice: number;
    total: number;
  }[];
  subtotal: number;
  tax: number;
  taxRate: number;
  discount: number;
  total: number;
  currency: string;
  status: "draft" | "sent" | "accepted" | "rejected" | "expired";
  validUntil: Date;
  notes?: string;
  terms?: string;
  createdAt: Date;
  updatedAt: Date;
}

const QuoteSchema = new Schema<IQuote>(
  {
    reference: { type: String, required: true, unique: true },
    client: { type: Schema.Types.ObjectId, ref: "Client" },
    inquiry: { type: Schema.Types.ObjectId, ref: "Inquiry" },
    items: [
      {
        description: { type: String, required: true },
        quantity: { type: Number, required: true, min: 1 },
        unitPrice: { type: Number, required: true, min: 0 },
        total: { type: Number, required: true },
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
      enum: ["draft", "sent", "accepted", "rejected", "expired"],
      default: "draft",
    },
    validUntil: { type: Date, required: true },
    notes: String,
    terms: String,
  },
  { timestamps: true }
);

QuoteSchema.index({ reference: 1 });
QuoteSchema.index({ client: 1 });
QuoteSchema.index({ status: 1 });

export default mongoose.models.Quote ||
  mongoose.model<IQuote>("Quote", QuoteSchema);
