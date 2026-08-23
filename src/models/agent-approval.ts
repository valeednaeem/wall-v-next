import mongoose, { Schema, Document } from "mongoose";

export interface IAgentApproval extends Document {
  agent: mongoose.Types.ObjectId;
  conversation?: mongoose.Types.ObjectId;
  execution?: mongoose.Types.ObjectId;
  type: "tool-call" | "action" | "message" | "project-create" | "payment" | "data-access";
  status: "pending" | "approved" | "rejected" | "expired" | "auto-approved";
  action: {
    type: string;
    description: string;
    parameters: Record<string, unknown>;
    risk: "low" | "medium" | "high" | "critical";
  };
  requestedBy: mongoose.Types.ObjectId;
  reviewedBy?: mongoose.Types.ObjectId;
  reviewedAt?: Date;
  expiresAt: Date;
  notes?: string;
  autoApprovedReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

const AgentApprovalSchema = new Schema<IAgentApproval>(
  {
    agent: { type: Schema.Types.ObjectId, ref: "Agent", required: true },
    conversation: { type: Schema.Types.ObjectId, ref: "AgentConversation" },
    execution: { type: Schema.Types.ObjectId, ref: "AgentExecution" },
    type: {
      type: String,
      enum: ["tool-call", "action", "message", "project-create", "payment", "data-access"],
      required: true,
    },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected", "expired", "auto-approved"],
      default: "pending",
    },
    action: {
      type: { type: String, required: true },
      description: { type: String, required: true },
      parameters: { type: Schema.Types.Mixed, default: {} },
      risk: { type: String, enum: ["low", "medium", "high", "critical"], default: "medium" },
    },
    requestedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    reviewedBy: { type: Schema.Types.ObjectId, ref: "User" },
    reviewedAt: Date,
    expiresAt: { type: Date, required: true },
    notes: String,
    autoApprovedReason: String,
  },
  { timestamps: true }
);

AgentApprovalSchema.index({ agent: 1 });
AgentApprovalSchema.index({ status: 1 });
AgentApprovalSchema.index({ conversation: 1 });
AgentApprovalSchema.index({ expiresAt: 1 });
AgentApprovalSchema.index({ reviewedBy: 1 });

export default mongoose.models.AgentApproval ||
  mongoose.model<IAgentApproval>("AgentApproval", AgentApprovalSchema);
