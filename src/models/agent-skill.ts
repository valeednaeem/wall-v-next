import mongoose, { Schema, Document } from "mongoose";

export interface IAgentSkill extends Document {
  name: string;
  slug: string;
  description: string;
  category: "client-communication" | "crm" | "project-management" | "design" | "development" | "seo" | "content" | "marketing" | "sales" | "finance" | "support" | "conversation" | "task" | "integration" | "analysis" | "generation";
  status: "active" | "inactive";
  version: number;
  instructions: string;
  systemPrompt?: string;
  capabilities: string[];
  inputs: { name: string; type: string; required: boolean; description: string }[];
  outputs: { name: string; type: string; description: string }[];
  requiredTools: mongoose.Types.ObjectId[];
  requiredPermissions: string[];
  supportedAgents: mongoose.Types.ObjectId[];
  supportedContexts: string[];
  supportedChannels: string[];
  triggers: {
    type: "keyword" | "intent" | "manual" | "webhook" | "schedule";
    value: string;
  }[];
  usage: {
    totalInvocations: number;
    lastUsed?: Date;
    successRate: number;
  };
  versionHistory: {
    version: number;
    changedBy: mongoose.Types.ObjectId;
    changedAt: Date;
    changes: string;
  }[];
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const AgentSkillSchema = new Schema<IAgentSkill>(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true },
    description: { type: String, required: true },
    category: {
      type: String,
      enum: ["client-communication", "crm", "project-management", "design", "development", "seo", "content", "marketing", "sales", "finance", "support", "conversation", "task", "integration", "analysis", "generation"],
      default: "conversation",
    },
    status: { type: String, enum: ["active", "inactive"], default: "active" },
    version: { type: Number, default: 1 },
    instructions: { type: String, required: true },
    systemPrompt: String,
    capabilities: [String],
    inputs: [{
      name: { type: String, required: true },
      type: { type: String, default: "string" },
      required: { type: Boolean, default: false },
      description: String,
    }],
    outputs: [{
      name: { type: String, required: true },
      type: { type: String, default: "string" },
      description: String,
    }],
    requiredTools: [{ type: Schema.Types.ObjectId, ref: "AgentTool" }],
    requiredPermissions: [String],
    supportedAgents: [{ type: Schema.Types.ObjectId, ref: "Agent" }],
    supportedContexts: [String],
    supportedChannels: [String],
    triggers: [
      {
        type: { type: String, enum: ["keyword", "intent", "manual", "webhook", "schedule"], required: true },
        value: { type: String, required: true },
      },
    ],
    usage: {
      totalInvocations: { type: Number, default: 0 },
      lastUsed: Date,
      successRate: { type: Number, default: 100 },
    },
    versionHistory: [{
      version: Number,
      changedBy: { type: Schema.Types.ObjectId, ref: "User" },
      changedAt: Date,
      changes: String,
    }],
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

AgentSkillSchema.index({ slug: 1 });
AgentSkillSchema.index({ category: 1 });
AgentSkillSchema.index({ status: 1 });

export default mongoose.models.AgentSkill ||
  mongoose.model<IAgentSkill>("AgentSkill", AgentSkillSchema);
