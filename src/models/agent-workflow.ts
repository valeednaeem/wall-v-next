import mongoose, { Schema, Document } from "mongoose";

export interface IAgentWorkflow extends Document {
  name: string;
  slug: string;
  description: string;
  status: "active" | "inactive" | "draft";
  trigger: {
    type: "manual" | "event" | "schedule" | "webhook";
    value: string;
    config?: Record<string, unknown>;
  };
  steps: {
    order: number;
    agent: mongoose.Types.ObjectId;
    skill?: mongoose.Types.ObjectId;
    tool?: mongoose.Types.ObjectId;
    inputMapping: Record<string, string>;
    outputMapping: Record<string, string>;
    condition?: string;
    onError: "stop" | "skip" | "retry" | "escalate";
    maxRetries: number;
    timeout: number;
  }[];
  context: {
    passProjectId: boolean;
    passClientId: boolean;
    passConversationId: boolean;
    inheritPermissions: boolean;
  };
  permissions: string[];
  usage: {
    totalRuns: number;
    lastRun?: Date;
    successRate: number;
    avgDuration: number;
  };
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const AgentWorkflowSchema = new Schema<IAgentWorkflow>(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true },
    description: { type: String, required: true },
    status: { type: String, enum: ["active", "inactive", "draft"], default: "draft" },
    trigger: {
      type: { type: String, enum: ["manual", "event", "schedule", "webhook"], required: true },
      value: { type: String, required: true },
      config: { type: Schema.Types.Mixed },
    },
    steps: [{
      order: { type: Number, required: true },
      agent: { type: Schema.Types.ObjectId, ref: "Agent", required: true },
      skill: { type: Schema.Types.ObjectId, ref: "AgentSkill" },
      tool: { type: Schema.Types.ObjectId, ref: "AgentTool" },
      inputMapping: { type: Schema.Types.Mixed, default: {} },
      outputMapping: { type: Schema.Types.Mixed, default: {} },
      condition: String,
      onError: { type: String, enum: ["stop", "skip", "retry", "escalate"], default: "stop" },
      maxRetries: { type: Number, default: 0 },
      timeout: { type: Number, default: 30000 },
    }],
    context: {
      passProjectId: { type: Boolean, default: false },
      passClientId: { type: Boolean, default: false },
      passConversationId: { type: Boolean, default: true },
      inheritPermissions: { type: Boolean, default: true },
    },
    permissions: [String],
    usage: {
      totalRuns: { type: Number, default: 0 },
      lastRun: Date,
      successRate: { type: Number, default: 100 },
      avgDuration: { type: Number, default: 0 },
    },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

AgentWorkflowSchema.index({ slug: 1 });
AgentWorkflowSchema.index({ status: 1 });
AgentWorkflowSchema.index({ createdBy: 1 });

export default mongoose.models.AgentWorkflow ||
  mongoose.model<IAgentWorkflow>("AgentWorkflow", AgentWorkflowSchema);
