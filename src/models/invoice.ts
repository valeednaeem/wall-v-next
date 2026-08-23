import mongoose, { Schema, Document } from "mongoose";

export interface IInvoice extends Document {
  invoiceNumber: string;
  client: mongoose.Types.ObjectId;
  project?: mongoose.Types.ObjectId;
  quotation?: mongoose.Types.ObjectId;
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
  amountPaid: number;
  amountDue: number;
  currency: string;
  status: "draft" | "sent" | "viewed" | "paid" | "partially-paid" | "overdue" | "cancelled" | "refunded";
  type: "milestone" | "deposit" | "final" | "maintenance" | "change-order" | "standard";
  dueDate: Date;
  paidAt?: Date;
  paymentMethod?: string;
  paymentReference?: string;
  notes?: string;
  terms?: string;
  billingAddress?: {
    name: string;
    email: string;
    address: string;
    city: string;
    country: string;
  };
  sentAt?: Date;
  viewedAt?: Date;
  preparedBy?: mongoose.Types.ObjectId;
  approvedBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const InvoiceSchema = new Schema<IInvoice>(
  {
    invoiceNumber: { type: String, required: true, unique: true },
    client: { type: Schema.Types.ObjectId, ref: "Client", required: true },
    project: { type: Schema.Types.ObjectId, ref: "Project" },
    quotation: { type: Schema.Types.ObjectId, ref: "Quote" },
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
    amountPaid: { type: Number, default: 0 },
    amountDue: { type: Number, required: true },
    currency: { type: String, default: "USD" },
    status: {
      type: String,
      enum: ["draft", "sent", "viewed", "paid", "partially-paid", "overdue", "cancelled", "refunded"],
      default: "draft",
    },
    type: { type: String, enum: ["milestone", "deposit", "final", "maintenance", "change-order", "standard"], default: "standard" },
    dueDate: { type: Date, required: true },
    paidAt: Date,
    paymentMethod: String,
    paymentReference: String,
    notes: String,
    terms: String,
    billingAddress: {
      name: String,
      email: String,
      address: String,
      city: String,
      country: String,
    },
    sentAt: Date,
    viewedAt: Date,
    preparedBy: { type: Schema.Types.ObjectId, ref: "User" },
    approvedBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

InvoiceSchema.index({ invoiceNumber: 1 });
InvoiceSchema.index({ client: 1 });
InvoiceSchema.index({ project: 1 });
InvoiceSchema.index({ status: 1 });

export default mongoose.models.Invoice ||
  mongoose.model<IInvoice>("Invoice", InvoiceSchema);
