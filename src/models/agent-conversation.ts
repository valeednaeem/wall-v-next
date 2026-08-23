import mongoose, { Schema, Document } from "mongoose";

export interface IAgentConversation extends Document {
  agent: mongoose.Types.ObjectId;
  sessionId: string;
  channel: "website" | "whatsapp" | "email" | "api" | "dashboard" | "voice";
  status: "active" | "ended" | "archived" | "escalated";
  visitor?: {
    id?: string;
    name?: string;
    email?: string;
    phone?: string;
    ip?: string;
    userAgent?: string;
    location?: string;
    referrer?: string;
  };
  context: {
    page?: string;
    referrer?: string;
    utmSource?: string;
    utmMedium?: string;
    utmCampaign?: string;
    language?: string;
    metadata?: Record<string, unknown>;
  };
  messages: {
    role: "user" | "assistant" | "system" | "tool";
    content: string;
    timestamp: Date;
    tokenCount?: number;
    toolCalls?: {
      toolId: mongoose.Types.ObjectId;
      toolName: string;
      input: Record<string, unknown>;
      output: Record<string, unknown>;
      duration: number;
      success: boolean;
    }[];
    metadata?: Record<string, unknown>;
  }[];
  summary?: string;
  sentiment?: "positive" | "neutral" | "negative";
  outcome: "none" | "inquiry-created" | "lead-created" | "project-created" | "payment-completed" | "escalated" | "resolved";
  outcomeDetails?: Record<string, unknown>;
  lead?: mongoose.Types.ObjectId;
  client?: mongoose.Types.ObjectId;
  project?: mongoose.Types.ObjectId;
  inquiry?: mongoose.Types.ObjectId;
  escalatedTo?: mongoose.Types.ObjectId;
  escalatedAt?: Date;
  satisfaction?: {
    score?: number;
    feedback?: string;
    submittedAt?: Date;
  };
  startedAt: Date;
  endedAt?: Date;
  duration?: number;
  messageCount: number;
  tokenUsage: {
    prompt: number;
    completion: number;
    total: number;
  };
  cost: number;
  createdAt: Date;
  updatedAt: Date;
}

const AgentConversationSchema = new Schema<IAgentConversation>(
  {
    agent: { type: Schema.Types.ObjectId, ref: "Agent", required: true },
    sessionId: { type: String, required: true },
    channel: { type: String, enum: ["website", "whatsapp", "email", "api", "dashboard", "voice"], default: "website" },
    status: { type: String, enum: ["active", "ended", "archived", "escalated"], default: "active" },
    visitor: {
      id: String,
      name: String,
      email: String,
      phone: String,
      ip: String,
      userAgent: String,
      location: String,
      referrer: String,
    },
    context: {
      page: String,
      referrer: String,
      utmSource: String,
      utmMedium: String,
      utmCampaign: String,
      language: { type: String, default: "en" },
      metadata: Schema.Types.Mixed,
    },
    messages: [
      {
        role: { type: String, enum: ["user", "assistant", "system", "tool"], required: true },
        content: { type: String, required: true },
        timestamp: { type: Date, default: Date.now },
        tokenCount: Number,
        toolCalls: [
          {
            toolId: { type: Schema.Types.ObjectId, ref: "AgentTool" },
            toolName: String,
            input: Schema.Types.Mixed,
            output: Schema.Types.Mixed,
            duration: Number,
            success: Boolean,
          },
        ],
        metadata: Schema.Types.Mixed,
      },
    ],
    summary: String,
    sentiment: { type: String, enum: ["positive", "neutral", "negative"] },
    outcome: {
      type: String,
      enum: ["none", "inquiry-created", "lead-created", "project-created", "payment-completed", "escalated", "resolved"],
      default: "none",
    },
    outcomeDetails: Schema.Types.Mixed,
    lead: { type: Schema.Types.ObjectId, ref: "Lead" },
    client: { type: Schema.Types.ObjectId, ref: "Client" },
    project: { type: Schema.Types.ObjectId, ref: "Project" },
    inquiry: { type: Schema.Types.ObjectId, ref: "Inquiry" },
    escalatedTo: { type: Schema.Types.ObjectId, ref: "User" },
    escalatedAt: Date,
    satisfaction: {
      score: { type: Number, min: 1, max: 5 },
      feedback: String,
      submittedAt: Date,
    },
    startedAt: { type: Date, default: Date.now },
    endedAt: Date,
    duration: Number,
    messageCount: { type: Number, default: 0 },
    tokenUsage: {
      prompt: { type: Number, default: 0 },
      completion: { type: Number, default: 0 },
      total: { type: Number, default: 0 },
    },
    cost: { type: Number, default: 0 },
  },
  { timestamps: true }
);

AgentConversationSchema.index({ agent: 1 });
AgentConversationSchema.index({ sessionId: 1 });
AgentConversationSchema.index({ status: 1 });
AgentConversationSchema.index({ channel: 1 });
AgentConversationSchema.index({ outcome: 1 });
AgentConversationSchema.index({ createdAt: -1 });
AgentConversationSchema.index({ "visitor.email": 1 });

export default mongoose.models.AgentConversation ||
  mongoose.model<IAgentConversation>("AgentConversation", AgentConversationSchema);
