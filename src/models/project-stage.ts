import mongoose, { Schema, Document } from "mongoose";

export interface IProjectStage extends Document {
  project: mongoose.Types.ObjectId;
  name: string;
  description?: string;
  order: number;
  status: "pending" | "active" | "blocked" | "under-review" | "approved" | "completed" | "cancelled";
  type: string;
  tasks: mongoose.Types.ObjectId[];
  deliverables: {
    name: string;
    description?: string;
    fileUrl?: string;
    uploadedBy?: mongoose.Types.ObjectId;
    uploadedAt?: Date;
    status: "pending" | "submitted" | "approved" | "rejected";
    feedback?: string;
  }[];
  acceptanceCriteria: string[];
  estimatedDays?: number;
  actualDays?: number;
  startDate?: Date;
  endDate?: Date;
  completedAt?: Date;
  completedBy?: mongoose.Types.ObjectId;
  notes?: string;
  generatedBy: "ai" | "pm" | "system";
  createdAt: Date;
  updatedAt: Date;
}

const ProjectStageSchema = new Schema<IProjectStage>(
  {
    project: { type: Schema.Types.ObjectId, ref: "Project", required: true },
    name: { type: String, required: true, trim: true },
    description: String,
    order: { type: Number, required: true },
    status: {
      type: String,
      enum: ["pending", "active", "blocked", "under-review", "approved", "completed", "cancelled"],
      default: "pending",
    },
    type: { type: String, required: true },
    tasks: [{ type: Schema.Types.ObjectId, ref: "Task" }],
    deliverables: [
      {
        name: { type: String, required: true },
        description: String,
        fileUrl: String,
        uploadedBy: { type: Schema.Types.ObjectId, ref: "User" },
        uploadedAt: Date,
        status: { type: String, enum: ["pending", "submitted", "approved", "rejected"], default: "pending" },
        feedback: String,
      },
    ],
    acceptanceCriteria: [String],
    estimatedDays: Number,
    actualDays: Number,
    startDate: Date,
    endDate: Date,
    completedAt: Date,
    completedBy: { type: Schema.Types.ObjectId, ref: "User" },
    notes: String,
    generatedBy: { type: String, enum: ["ai", "pm", "system"], default: "ai" },
  },
  { timestamps: true }
);

ProjectStageSchema.index({ project: 1 });
ProjectStageSchema.index({ project: 1, order: 1 });
ProjectStageSchema.index({ status: 1 });

export default mongoose.models.ProjectStage ||
  mongoose.model<IProjectStage>("ProjectStage", ProjectStageSchema);
