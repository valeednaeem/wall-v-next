import mongoose, { Schema, Document } from "mongoose";

export interface IAgentTool extends Document {
  name: string;
  slug: string;
  description: string;
  category: "system" | "custom" | "integration";
  type: "function" | "api" | "database" | "webhook" | "internal";
  status: "active" | "inactive" | "deprecated";
  config: {
    endpoint?: string;
    method?: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
    headers?: Record<string, string>;
    bodyTemplate?: string;
    responseMapping?: string;
    timeout?: number;
    retries?: number;
  };
  parameters: {
    name: string;
    type: "string" | "number" | "boolean" | "object" | "array";
    required: boolean;
    description: string;
    defaultValue?: unknown;
    enum?: string[];
  }[];
  permissions: string[];
  rateLimit?: {
    maxCalls: number;
    windowMs: number;
  };
  usage: {
    totalCalls: number;
    lastUsed?: Date;
    avgResponseTime: number;
    errorRate: number;
  };
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const AgentToolSchema = new Schema<IAgentTool>(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true },
    description: { type: String, required: true },
    category: { type: String, enum: ["system", "custom", "integration"], default: "custom" },
    type: { type: String, enum: ["function", "api", "database", "webhook", "internal"], required: true },
    status: { type: String, enum: ["active", "inactive", "deprecated"], default: "active" },
    config: {
      endpoint: String,
      method: { type: String, enum: ["GET", "POST", "PUT", "DELETE", "PATCH"] },
      headers: { type: Schema.Types.Mixed },
      bodyTemplate: String,
      responseMapping: String,
      timeout: { type: Number, default: 30000 },
      retries: { type: Number, default: 3 },
    },
    parameters: [
      {
        name: { type: String, required: true },
        type: { type: String, enum: ["string", "number", "boolean", "object", "array"], required: true },
        required: { type: Boolean, default: false },
        description: String,
        defaultValue: Schema.Types.Mixed,
        enum: [String],
      },
    ],
    permissions: [String],
    rateLimit: {
      maxCalls: { type: Number, default: 100 },
      windowMs: { type: Number, default: 60000 },
    },
    usage: {
      totalCalls: { type: Number, default: 0 },
      lastUsed: Date,
      avgResponseTime: { type: Number, default: 0 },
      errorRate: { type: Number, default: 0 },
    },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

AgentToolSchema.index({ slug: 1 });
AgentToolSchema.index({ category: 1 });
AgentToolSchema.index({ status: 1 });
AgentToolSchema.index({ createdBy: 1 });

export default mongoose.models.AgentTool ||
  mongoose.model<IAgentTool>("AgentTool", AgentToolSchema);
