import mongoose, { Schema, Document } from "mongoose";

export interface IAgentTeam extends Document {
  name: string;
  slug: string;
  description: string;
  status: "active" | "inactive";
  members: {
    agent: mongoose.Types.ObjectId;
    role: "lead" | "contributor" | "reviewer" | "specialist";
    joinedAt: Date;
  }[];
  leadAgent?: mongoose.Types.ObjectId;
  tags: string[];
  projectId?: mongoose.Types.ObjectId;
  maxMembers: number;
  usage: {
    totalTasks: number;
    completedTasks: number;
    avgCompletionTime: number;
  };
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const AgentTeamSchema = new Schema<IAgentTeam>(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true },
    description: { type: String, default: "" },
    status: { type: String, enum: ["active", "inactive"], default: "active" },
    members: [{
      agent: { type: Schema.Types.ObjectId, ref: "Agent", required: true },
      role: { type: String, enum: ["lead", "contributor", "reviewer", "specialist"], default: "contributor" },
      joinedAt: { type: Date, default: Date.now },
    }],
    leadAgent: { type: Schema.Types.ObjectId, ref: "Agent" },
    tags: [String],
    projectId: { type: Schema.Types.ObjectId, ref: "Project" },
    maxMembers: { type: Number, default: 10 },
    usage: {
      totalTasks: { type: Number, default: 0 },
      completedTasks: { type: Number, default: 0 },
      avgCompletionTime: { type: Number, default: 0 },
    },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

AgentTeamSchema.index({ slug: 1 });
AgentTeamSchema.index({ status: 1 });
AgentTeamSchema.index({ projectId: 1 });
AgentTeamSchema.index({ "members.agent": 1 });

export default mongoose.models.AgentTeam ||
  mongoose.model<IAgentTeam>("AgentTeam", AgentTeamSchema);
