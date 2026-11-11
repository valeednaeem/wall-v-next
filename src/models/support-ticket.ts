import mongoose, { Schema, Document } from "mongoose";

export interface ISupportTicket extends Document {
  ticketNumber: string;
  user: mongoose.Types.ObjectId;
  subject: string;
  message: string;
  status: "open" | "in-progress" | "waiting" | "resolved" | "closed";
  priority: "low" | "medium" | "high" | "urgent";
  category: string;
  assignedTo?: mongoose.Types.ObjectId;
  relatedProduct?: mongoose.Types.ObjectId;
  relatedProject?: mongoose.Types.ObjectId;
  messages: {
    sender: mongoose.Types.ObjectId;
    content: string;
    attachments: string[];
    timestamp: Date;
    isAdmin: boolean;
  }[];
  tags: string[];
  firstResponseAt?: Date;
  resolvedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const SupportTicketSchema = new Schema<ISupportTicket>(
  {
    ticketNumber: { type: String, required: true, unique: true },
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    subject: { type: String, required: true, trim: true },
    message: { type: String, required: true },
    status: {
      type: String,
      enum: ["open", "in-progress", "waiting", "resolved", "closed"],
      default: "open",
    },
    priority: {
      type: String,
      enum: ["low", "medium", "high", "urgent"],
      default: "medium",
    },
    category: { type: String, required: true },
    assignedTo: { type: Schema.Types.ObjectId, ref: "User" },
    relatedProduct: { type: Schema.Types.ObjectId, ref: "Product" },
    relatedProject: { type: Schema.Types.ObjectId, ref: "Project" },
    messages: [
      {
        sender: { type: Schema.Types.ObjectId, ref: "User" },
        content: String,
        attachments: [String],
        timestamp: { type: Date, default: Date.now },
        isAdmin: { type: Boolean, default: false },
      },
    ],
    tags: [String],
    firstResponseAt: Date,
    resolvedAt: Date,
  },
  { timestamps: true }
);

SupportTicketSchema.index({ ticketNumber: 1 });
SupportTicketSchema.index({ user: 1 });
SupportTicketSchema.index({ status: 1 });

export default mongoose.models.SupportTicket ||
  mongoose.model<ISupportTicket>("SupportTicket", SupportTicketSchema);
