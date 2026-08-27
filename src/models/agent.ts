import mongoose, { Schema, Document } from "mongoose";

export interface IAgent extends Document {
  name: string;
  slug: string;
  description: string;
  type: "conversational" | "task" | "hybrid";
  role: "sales" | "support" | "technical" | "marketing" | "operations" | "custom";
  status: "active" | "inactive" | "draft" | "testing";
  version: number;
  avatar?: string;
  division?: string;
  divisionLabel?: string;
  divisionIcon?: string;
  divisionColor?: string;
  personality?: {
    tone: "formal" | "casual" | "friendly" | "professional" | "technical";
    language: string;
    maxResponseLength?: number;
    responseStyle?: string;
  };
  systemPrompt: string;
  instructions: string[];
  aiModel: string;
  temperature: number;
  maxTokens: number;
  skills: mongoose.Types.ObjectId[];
  tools: mongoose.Types.ObjectId[];
  hooks: mongoose.Types.ObjectId[];
  workflows: mongoose.Types.ObjectId[];
  memory: {
    type: "none" | "conversation" | "persistent" | "global";
    maxItems?: number;
    ttl?: number;
  };
  guardrails: {
    blockedTopics: string[];
    maxConversationLength: number;
    requireApproval: boolean;
    approvalThreshold?: number;
    escalateTo?: mongoose.Types.ObjectId;
    fallbackMessage?: string;
    contentFilter: boolean;
  };
  channels: {
    website: boolean;
    whatsapp: boolean;
    email: boolean;
    api: boolean;
    dashboard: boolean;
    voice: boolean;
  };
  contexts: {
    visitor: boolean;
    lead: boolean;
    customer: boolean;
    client: boolean;
    admin: boolean;
    staff: boolean;
    system: boolean;
  };
  permissions: string[];
  integrations: {
    crm: boolean;
    projects: boolean;
    billing: boolean;
    support: boolean;
  };
  isClientFacing: boolean;
  isMasterAgent: boolean;
  masterConfig?: {
    canCreateProjects: boolean;
    canGenerateQuotes: boolean;
    canProcessPayments: boolean;
    canScheduleMeetings: boolean;
    requirementSteps: string[];
    approvalRequired: boolean;
    autoAssignManager?: mongoose.Types.ObjectId;
    orchestrates: mongoose.Types.ObjectId[];
  };
  triggerTypes: string[];
  versionHistory: {
    version: number;
    changedBy: mongoose.Types.ObjectId;
    changedAt: Date;
    changes: string;
  }[];
  stats: {
    totalConversations: number;
    totalMessages: number;
    avgConversationLength: number;
    satisfactionScore: number;
    conversionRate: number;
    lastActive?: Date;
    avgResponseTime: number;
    resolutionRate: number;
    totalExecutions: number;
    successfulExecutions: number;
    failedExecutions: number;
  };
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const AgentSchema = new Schema<IAgent>(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true },
    description: { type: String, required: true },
    type: { type: String, enum: ["conversational", "task", "hybrid"], default: "conversational" },
    role: { type: String, enum: ["sales", "support", "technical", "marketing", "operations", "custom"], default: "custom" },
    status: { type: String, enum: ["active", "inactive", "draft", "testing"], default: "draft" },
    version: { type: Number, default: 1 },
    avatar: String,
    division: { type: String, index: true },
    divisionLabel: String,
    divisionIcon: String,
    divisionColor: String,
    personality: {
      tone: { type: String, enum: ["formal", "casual", "friendly", "professional", "technical"], default: "professional" },
      language: { type: String, default: "en" },
      maxResponseLength: Number,
      responseStyle: String,
    },
    systemPrompt: { type: String, required: true },
    instructions: [String],
    aiModel: { type: String, default: "gpt-4o" },
    temperature: { type: Number, default: 0.7, min: 0, max: 2 },
    maxTokens: { type: Number, default: 2048, min: 1, max: 128000 },
    skills: [{ type: Schema.Types.ObjectId, ref: "AgentSkill" }],
    tools: [{ type: Schema.Types.ObjectId, ref: "AgentTool" }],
    hooks: [{ type: Schema.Types.ObjectId, ref: "AgentHook" }],
    workflows: [{ type: Schema.Types.ObjectId, ref: "AgentWorkflow" }],
    memory: {
      memoryType: { type: String, enum: ["none", "conversation", "persistent", "global"], default: "conversation" },
      maxItems: { type: Number, default: 50 },
      ttl: { type: Number, default: 86400 },
    },
    guardrails: {
      blockedTopics: [String],
      maxConversationLength: { type: Number, default: 100 },
      requireApproval: { type: Boolean, default: false },
      approvalThreshold: Number,
      escalateTo: { type: Schema.Types.ObjectId, ref: "User" },
      fallbackMessage: { type: String, default: "I'm sorry, I can't help with that. Let me connect you with a human agent." },
      contentFilter: { type: Boolean, default: true },
    },
    channels: {
      website: { type: Boolean, default: true },
      whatsapp: { type: Boolean, default: false },
      email: { type: Boolean, default: false },
      api: { type: Boolean, default: false },
      dashboard: { type: Boolean, default: true },
      voice: { type: Boolean, default: false },
    },
    contexts: {
      visitor: { type: Boolean, default: true },
      lead: { type: Boolean, default: true },
      customer: { type: Boolean, default: true },
      client: { type: Boolean, default: true },
      admin: { type: Boolean, default: true },
      staff: { type: Boolean, default: true },
      system: { type: Boolean, default: false },
    },
    permissions: [String],
    integrations: {
      crm: { type: Boolean, default: true },
      projects: { type: Boolean, default: true },
      billing: { type: Boolean, default: false },
      support: { type: Boolean, default: false },
    },
    isClientFacing: { type: Boolean, default: false },
    isMasterAgent: { type: Boolean, default: false },
    masterConfig: {
      canCreateProjects: { type: Boolean, default: true },
      canGenerateQuotes: { type: Boolean, default: true },
      canProcessPayments: { type: Boolean, default: false },
      canScheduleMeetings: { type: Boolean, default: true },
      requirementSteps: [String],
      approvalRequired: { type: Boolean, default: true },
      autoAssignManager: { type: Schema.Types.ObjectId, ref: "User" },
      orchestrates: [{ type: Schema.Types.ObjectId, ref: "Agent" }],
    },
    triggerTypes: [String],
    versionHistory: [{
      version: Number,
      changedBy: { type: Schema.Types.ObjectId, ref: "User" },
      changedAt: Date,
      changes: String,
    }],
    stats: {
      totalConversations: { type: Number, default: 0 },
      totalMessages: { type: Number, default: 0 },
      avgConversationLength: { type: Number, default: 0 },
      satisfactionScore: { type: Number, default: 0 },
      conversionRate: { type: Number, default: 0 },
      lastActive: Date,
      avgResponseTime: { type: Number, default: 0 },
      resolutionRate: { type: Number, default: 0 },
      totalExecutions: { type: Number, default: 0 },
      successfulExecutions: { type: Number, default: 0 },
      failedExecutions: { type: Number, default: 0 },
    },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

AgentSchema.index({ slug: 1 });
AgentSchema.index({ status: 1 });
AgentSchema.index({ role: 1 });
AgentSchema.index({ isClientFacing: 1 });
AgentSchema.index({ isMasterAgent: 1 });
AgentSchema.index({ createdBy: 1 });

export default mongoose.models.Agent ||
  mongoose.model<IAgent>("Agent", AgentSchema);
