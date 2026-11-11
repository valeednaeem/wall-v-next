import mongoose, { Schema, Document } from "mongoose";

export interface ICrmTask extends Document {
  title: string;
  description?: string;
  type: "follow-up" | "call" | "meeting" | "email" | "other";
  status: "pending" | "in-progress" | "completed" | "cancelled";
  priority: "low" | "medium" | "high" | "urgent";
  dueDate?: Date;
  completedAt?: Date;
  assignee: mongoose.Types.ObjectId;
  relatedTo?: {
    model: string;
    id: mongoose.Types.ObjectId;
  };
  lead?: mongoose.Types.ObjectId;
  client?: mongoose.Types.ObjectId;
  inquiry?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const CrmTaskSchema = new Schema<ICrmTask>(
  {
    title: { type: String, required: true, trim: true },
    description: String,
    type: {
      type: String,
      enum: ["follow-up", "call", "meeting", "email", "other"],
      required: true,
    },
    status: {
      type: String,
      enum: ["pending", "in-progress", "completed", "cancelled"],
      default: "pending",
    },
    priority: {
      type: String,
      enum: ["low", "medium", "high", "urgent"],
      default: "medium",
    },
    dueDate: Date,
    completedAt: Date,
    assignee: { type: Schema.Types.ObjectId, ref: "User", required: true },
    relatedTo: {
      model: String,
      id: { type: Schema.Types.ObjectId },
    },
    lead: { type: Schema.Types.ObjectId, ref: "Lead" },
    client: { type: Schema.Types.ObjectId, ref: "Client" },
    inquiry: { type: Schema.Types.ObjectId, ref: "Inquiry" },
  },
  { timestamps: true }
);

CrmTaskSchema.index({ assignee: 1 });
CrmTaskSchema.index({ status: 1 });
CrmTaskSchema.index({ dueDate: 1 });

export default mongoose.models.CrmTask ||
  mongoose.model<ICrmTask>("CrmTask", CrmTaskSchema);
