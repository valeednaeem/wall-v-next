import mongoose, { Schema, Document } from "mongoose";

export interface IQuote extends Document {
  reference: string;
  project?: mongoose.Types.ObjectId;
  client?: mongoose.Types.ObjectId;
  inquiry?: mongoose.Types.ObjectId;
  items: {
    description: string;
    quantity: number;
    unitPrice: number;
    total: number;
    category?: string;
    stage?: mongoose.Types.ObjectId;
  }[];
  subtotal: number;
  tax: number;
  taxRate: number;
  discount: number;
  total: number;
  currency: string;
  status: "draft" | "internal-review" | "sent" | "viewed" | "accepted" | "rejected" | "revision-requested" | "expired";
  validUntil: Date;
  notes?: string;
  terms?: string;
  version: number;
  sentAt?: Date;
  viewedAt?: Date;
  acceptedAt?: Date;
  rejectedAt?: Date;
  rejectedReason?: string;
  preparedBy?: mongoose.Types.ObjectId;
  approvedBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const QuoteSchema = new Schema<IQuote>(
  {
    reference: { type: String, required: true, unique: true },
    project: { type: Schema.Types.ObjectId, ref: "Project" },
    client: { type: Schema.Types.ObjectId, ref: "Client" },
    inquiry: { type: Schema.Types.ObjectId, ref: "Inquiry" },
    items: [
      {
        description: { type: String, required: true },
        quantity: { type: Number, required: true, min: 1 },
        unitPrice: { type: Number, required: true, min: 0 },
        total: { type: Number, required: true },
        category: String,
        stage: { type: Schema.Types.ObjectId, ref: "ProjectStage" },
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
      enum: ["draft", "internal-review", "sent", "viewed", "accepted", "rejected", "revision-requested", "expired"],
      default: "draft",
    },
    validUntil: { type: Date, required: true },
    notes: String,
    terms: String,
    version: { type: Number, default: 1 },
    sentAt: Date,
    viewedAt: Date,
    acceptedAt: Date,
    rejectedAt: Date,
    rejectedReason: String,
    preparedBy: { type: Schema.Types.ObjectId, ref: "User" },
    approvedBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

QuoteSchema.index({ reference: 1 });
QuoteSchema.index({ client: 1 });
QuoteSchema.index({ project: 1 });
QuoteSchema.index({ status: 1 });

export default mongoose.models.Quote ||
  mongoose.model<IQuote>("Quote", QuoteSchema);
