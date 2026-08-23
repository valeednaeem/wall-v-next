import mongoose, { Schema, Document } from "mongoose";

export interface IAgentSkill extends Document {
  name: string;
  slug: string;
  description: string;
  category: "conversation" | "task" | "integration" | "analysis" | "generation";
  status: "active" | "inactive";
  instructions: string;
  systemPrompt?: string;
  capabilities: string[];
  requiredTools: mongoose.Types.ObjectId[];
  triggers: {
    type: "keyword" | "intent" | "manual" | "webhook" | "schedule";
    value: string;
  }[];
  usage: {
    totalInvocations: number;
    lastUsed?: Date;
    successRate: number;
  };
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
      enum: ["conversation", "task", "integration", "analysis", "generation"],
      default: "conversation",
    },
    status: { type: String, enum: ["active", "inactive"], default: "active" },
    instructions: { type: String, required: true },
    systemPrompt: String,
    capabilities: [String],
    requiredTools: [{ type: Schema.Types.ObjectId, ref: "AgentTool" }],
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
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

AgentSkillSchema.index({ slug: 1 });
AgentSkillSchema.index({ category: 1 });
AgentSkillSchema.index({ status: 1 });

export default mongoose.models.AgentSkill ||
  mongoose.model<IAgentSkill>("AgentSkill", AgentSkillSchema);
