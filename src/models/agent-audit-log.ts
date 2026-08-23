import mongoose, { Schema, Document } from "mongoose";

export interface IAgentAuditLog extends Document {
  agent?: mongoose.Types.ObjectId;
  conversation?: mongoose.Types.ObjectId;
  execution?: mongoose.Types.ObjectId;
  action: string;
  category: "agent" | "conversation" | "tool" | "hook" | "approval" | "config" | "system";
  description: string;
  performedBy: mongoose.Types.ObjectId;
  changes?: {
    field: string;
    oldValue: unknown;
    newValue: unknown;
  }[];
  metadata?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  createdAt: Date;
}

const AgentAuditLogSchema = new Schema<IAgentAuditLog>(
  {
    agent: { type: Schema.Types.ObjectId, ref: "Agent" },
    conversation: { type: Schema.Types.ObjectId, ref: "AgentConversation" },
    execution: { type: Schema.Types.ObjectId, ref: "AgentExecution" },
    action: { type: String, required: true },
    category: {
      type: String,
      enum: ["agent", "conversation", "tool", "hook", "approval", "config", "system"],
      required: true,
    },
    description: { type: String, required: true },
    performedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    changes: [
      {
        field: String,
        oldValue: Schema.Types.Mixed,
        newValue: Schema.Types.Mixed,
      },
    ],
    metadata: Schema.Types.Mixed,
    ipAddress: String,
    userAgent: String,
  },
  { timestamps: true }
);

AgentAuditLogSchema.index({ agent: 1 });
AgentAuditLogSchema.index({ performedBy: 1 });
AgentAuditLogSchema.index({ category: 1 });
AgentAuditLogSchema.index({ action: 1 });
AgentAuditLogSchema.index({ createdAt: -1 });

export default mongoose.models.AgentAuditLog ||
  mongoose.model<IAgentAuditLog>("AgentAuditLog", AgentAuditLogSchema);
