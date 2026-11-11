import mongoose, { Schema, Document } from "mongoose";

export interface IAgentMemory extends Document {
  agent: mongoose.Types.ObjectId;
  conversation?: mongoose.Types.ObjectId;
  type: "short-term" | "long-term" | "episodic" | "semantic";
  category: "user-preference" | "fact" | "interaction" | "context" | "skill-result" | "error";
  key: string;
  value: Record<string, unknown>;
  embedding?: number[];
  relevance: number;
  accessCount: number;
  lastAccessedAt: Date;
  expiresAt?: Date;
  createdBy?: mongoose.Types.ObjectId;
  sessionId?: string;
  createdAt: Date;
  updatedAt: Date;
}

const AgentMemorySchema = new Schema<IAgentMemory>(
  {
    agent: { type: Schema.Types.ObjectId, ref: "Agent", required: true },
    conversation: { type: Schema.Types.ObjectId, ref: "AgentConversation" },
    type: { type: String, enum: ["short-term", "long-term", "episodic", "semantic"], default: "short-term" },
    category: {
      type: String,
      enum: ["user-preference", "fact", "interaction", "context", "skill-result", "error"],
      required: true,
    },
    key: { type: String, required: true },
    value: { type: Schema.Types.Mixed, required: true },
    embedding: [{ type: Number }],
    relevance: { type: Number, default: 1, min: 0, max: 1 },
    accessCount: { type: Number, default: 0 },
    lastAccessedAt: { type: Date, default: Date.now },
    expiresAt: Date,
    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
    sessionId: String,
  },
  { timestamps: true }
);

AgentMemorySchema.index({ agent: 1 });
AgentMemorySchema.index({ agent: 1, type: 1 });
AgentMemorySchema.index({ agent: 1, category: 1 });
AgentMemorySchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
AgentMemorySchema.index({ conversation: 1 });

export default mongoose.models.AgentMemory ||
  mongoose.model<IAgentMemory>("AgentMemory", AgentMemorySchema);
