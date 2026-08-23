import mongoose, { Schema, Document } from "mongoose";

export interface IAgentExecution extends Document {
  agent: mongoose.Types.ObjectId;
  conversation?: mongoose.Types.ObjectId;
  type: "chat" | "tool-call" | "hook-trigger" | "skill-invoke" | "batch" | "scheduled";
  status: "pending" | "running" | "completed" | "failed" | "timeout" | "cancelled";
  input: {
    message?: string;
    toolId?: mongoose.Types.ObjectId;
    toolName?: string;
    parameters?: Record<string, unknown>;
    hookId?: mongoose.Types.ObjectId;
    skillId?: mongoose.Types.ObjectId;
    batchId?: string;
  };
  output?: {
    response?: string;
    toolResult?: Record<string, unknown>;
    error?: string;
    stackTrace?: string;
  };
  tokens: {
    prompt: number;
    completion: number;
    total: number;
  };
  cost: number;
  duration: number;
  retryCount: number;
  maxRetries: number;
  error?: {
    message: string;
    code?: string;
    stack?: string;
  };
  metadata?: Record<string, unknown>;
  startedAt: Date;
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const AgentExecutionSchema = new Schema<IAgentExecution>(
  {
    agent: { type: Schema.Types.ObjectId, ref: "Agent", required: true },
    conversation: { type: Schema.Types.ObjectId, ref: "AgentConversation" },
    type: {
      type: String,
      enum: ["chat", "tool-call", "hook-trigger", "skill-invoke", "batch", "scheduled"],
      required: true,
    },
    status: {
      type: String,
      enum: ["pending", "running", "completed", "failed", "timeout", "cancelled"],
      default: "pending",
    },
    input: {
      message: String,
      toolId: { type: Schema.Types.ObjectId, ref: "AgentTool" },
      toolName: String,
      parameters: Schema.Types.Mixed,
      hookId: { type: Schema.Types.ObjectId, ref: "AgentHook" },
      skillId: { type: Schema.Types.ObjectId, ref: "AgentSkill" },
      batchId: String,
    },
    output: {
      response: String,
      toolResult: Schema.Types.Mixed,
      error: String,
      stackTrace: String,
    },
    tokens: {
      prompt: { type: Number, default: 0 },
      completion: { type: Number, default: 0 },
      total: { type: Number, default: 0 },
    },
    cost: { type: Number, default: 0 },
    duration: { type: Number, default: 0 },
    retryCount: { type: Number, default: 0 },
    maxRetries: { type: Number, default: 3 },
    error: {
      message: String,
      code: String,
      stack: String,
    },
    metadata: Schema.Types.Mixed,
    startedAt: { type: Date, default: Date.now },
    completedAt: Date,
  },
  { timestamps: true }
);

AgentExecutionSchema.index({ agent: 1 });
AgentExecutionSchema.index({ conversation: 1 });
AgentExecutionSchema.index({ type: 1 });
AgentExecutionSchema.index({ status: 1 });
AgentExecutionSchema.index({ createdAt: -1 });
AgentExecutionSchema.index({ "input.toolId": 1 });

export default mongoose.models.AgentExecution ||
  mongoose.model<IAgentExecution>("AgentExecution", AgentExecutionSchema);
