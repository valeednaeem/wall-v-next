import mongoose, { Schema, Document } from "mongoose";

export interface IInquiry extends Document {
  name: string;
  email: string;
  phone?: string;
  company?: string;
  subject: string;
  message: string;
  type: "contact" | "support" | "sales" | "partnership" | "other";
  status: "new" | "read" | "replied" | "in-progress" | "resolved" | "closed";
  priority: "low" | "medium" | "high" | "urgent";
  source?: string;
  assignedTo?: mongoose.Types.ObjectId;
  client?: mongoose.Types.ObjectId;
  lead?: mongoose.Types.ObjectId;
  tags: string[];
  messages: {
    sender: string;
    content: string;
    timestamp: Date;
    isAdmin: boolean;
  }[];
  estimatedBudget?: number;
  estimatedTimeline?: string;
  convertedToProject?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const InquirySchema = new Schema<IInquiry>(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    phone: String,
    company: String,
    subject: { type: String, required: true, trim: true },
    message: { type: String, required: true },
    type: {
      type: String,
      enum: ["contact", "support", "sales", "partnership", "other"],
      default: "contact",
    },
    status: {
      type: String,
      enum: ["new", "read", "replied", "in-progress", "resolved", "closed"],
      default: "new",
    },
    priority: {
      type: String,
      enum: ["low", "medium", "high", "urgent"],
      default: "medium",
    },
    source: String,
    assignedTo: { type: Schema.Types.ObjectId, ref: "User" },
    client: { type: Schema.Types.ObjectId, ref: "Client" },
    lead: { type: Schema.Types.ObjectId, ref: "Lead" },
    tags: [String],
    messages: [
      {
        sender: String,
        content: String,
        timestamp: { type: Date, default: Date.now },
        isAdmin: { type: Boolean, default: false },
      },
    ],
    estimatedBudget: Number,
    estimatedTimeline: String,
    convertedToProject: { type: Schema.Types.ObjectId, ref: "Project" },
  },
  { timestamps: true }
);

InquirySchema.index({ status: 1 });
InquirySchema.index({ type: 1 });
InquirySchema.index({ assignedTo: 1 });

export default mongoose.models.Inquiry ||
  mongoose.model<IInquiry>("Inquiry", InquirySchema);
