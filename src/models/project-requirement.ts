import mongoose, { Schema, Document } from "mongoose";

export interface IProjectRequirement extends Document {
  project: mongoose.Types.ObjectId;
  title: string;
  description: string;
  category: "functional" | "technical" | "design" | "content" | "integration" | "security" | "performance" | "other";
  priority: "must-have" | "should-have" | "nice-to-have" | "deferred";
  status: "proposed" | "approved" | "in-progress" | "implemented" | "verified" | "rejected" | "changed";
  scope: "in-scope" | "out-of-scope" | "under-review";
  source: "client" | "ai" | "pm" | "team";
  version: number;
  history: {
    version: number;
    title: string;
    description: string;
    scope: string;
    status: string;
    changedBy: mongoose.Types.ObjectId;
    changedAt: Date;
    reason?: string;
  }[];
  affectedStages: mongoose.Types.ObjectId[];
  affectedTasks: mongoose.Types.ObjectId[];
  changeRequest?: mongoose.Types.ObjectId;
  estimatedImpact?: {
    hours?: number;
    cost?: number;
    timelineDays?: number;
  };
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const ProjectRequirementSchema = new Schema<IProjectRequirement>(
  {
    project: { type: Schema.Types.ObjectId, ref: "Project", required: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true },
    category: {
      type: String,
      enum: ["functional", "technical", "design", "content", "integration", "security", "performance", "other"],
      default: "functional",
    },
    priority: { type: String, enum: ["must-have", "should-have", "nice-to-have", "deferred"], default: "must-have" },
    status: { type: String, enum: ["proposed", "approved", "in-progress", "implemented", "verified", "rejected", "changed"], default: "proposed" },
    scope: { type: String, enum: ["in-scope", "out-of-scope", "under-review"], default: "in-scope" },
    source: { type: String, enum: ["client", "ai", "pm", "team"], default: "client" },
    version: { type: Number, default: 1 },
    history: [
      {
        version: Number,
        title: String,
        description: String,
        scope: String,
        status: String,
        changedBy: { type: Schema.Types.ObjectId, ref: "User" },
        changedAt: { type: Date, default: Date.now },
        reason: String,
      },
    ],
    affectedStages: [{ type: Schema.Types.ObjectId, ref: "ProjectStage" }],
    affectedTasks: [{ type: Schema.Types.ObjectId, ref: "Task" }],
    changeRequest: { type: Schema.Types.ObjectId, ref: "ChangeRequest" },
    estimatedImpact: {
      hours: Number,
      cost: Number,
      timelineDays: Number,
    },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

ProjectRequirementSchema.index({ project: 1 });
ProjectRequirementSchema.index({ project: 1, status: 1 });
ProjectRequirementSchema.index({ scope: 1 });

export default mongoose.models.ProjectRequirement ||
  mongoose.model<IProjectRequirement>("ProjectRequirement", ProjectRequirementSchema);
