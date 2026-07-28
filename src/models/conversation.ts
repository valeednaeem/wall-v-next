import mongoose, { Schema, Document } from "mongoose";

export interface IConversation extends Document {
  sessionId: string;
  visitorId?: string;
  language: string;
  agentType: "discovery" | "voice-agent";
  channel: "chat" | "voice";
  messages: {
    role: "user" | "assistant";
    content: string;
    timestamp: Date;
  }[];
  projectBrief?: {
    projectType?: string;
    features?: string[];
    budget?: string;
    timeline?: string;
    clientName?: string;
    clientEmail?: string;
    clientPhone?: string;
  };
  voiceAgent?: {
    dograhAgentId?: string;
    workflowRunId?: string;
    durationSeconds?: number;
    callStatus?: string;
    transcript?: string;
    summary?: string;
  };
  outcome: "none" | "inquiry-created" | "project-created" | "payment-completed";
  projectId?: mongoose.Types.ObjectId;
  inquiryId?: mongoose.Types.ObjectId;
  leadId?: mongoose.Types.ObjectId;
  convertedAt?: Date;
  startedAt: Date;
  endedAt?: Date;
  messageCount: number;
  createdAt: Date;
  updatedAt: Date;
}

const ConversationSchema = new Schema<IConversation>(
  {
    sessionId: { type: String, required: true },
    visitorId: String,
    language: { type: String, default: "en" },
    agentType: { type: String, enum: ["discovery", "voice-agent"], default: "discovery" },
    channel: { type: String, enum: ["chat", "voice"], default: "chat" },
    messages: [
      {
        role: { type: String, enum: ["user", "assistant"], required: true },
        content: { type: String, required: true },
        timestamp: { type: Date, default: Date.now },
      },
    ],
    projectBrief: {
      projectType: String,
      features: [String],
      budget: String,
      timeline: String,
      clientName: String,
      clientEmail: String,
      clientPhone: String,
    },
    voiceAgent: {
      dograhAgentId: String,
      workflowRunId: String,
      durationSeconds: Number,
      callStatus: String,
      transcript: String,
      summary: String,
    },
    outcome: {
      type: String,
      enum: ["none", "inquiry-created", "project-created", "payment-completed"],
      default: "none",
    },
    projectId: { type: Schema.Types.ObjectId, ref: "Project" },
    inquiryId: { type: Schema.Types.ObjectId, ref: "Inquiry" },
    leadId: { type: Schema.Types.ObjectId, ref: "Lead" },
    convertedAt: Date,
    startedAt: { type: Date, default: Date.now },
    endedAt: Date,
    messageCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

ConversationSchema.index({ sessionId: 1 });
ConversationSchema.index({ outcome: 1 });
ConversationSchema.index({ agentType: 1 });
ConversationSchema.index({ channel: 1 });
ConversationSchema.index({ createdAt: -1 });

export default mongoose.models.Conversation ||
  mongoose.model<IConversation>("Conversation", ConversationSchema);
