import mongoose, { Schema, Document } from "mongoose";

export interface IChangeRequest extends Document {
  project: mongoose.Types.ObjectId;
  title: string;
  description: string;
  type: "scope" | "timeline" | "budget" | "requirement" | "technical" | "other";
  status: "draft" | "submitted" | "under-review" | "approved" | "rejected" | "implemented";
  priority: "low" | "medium" | "high" | "urgent";
  requestedBy: mongoose.Types.ObjectId;
  requestedFor?: mongoose.Types.ObjectId;
  reason: string;
  impact: {
    scope?: string;
    timeline?: string;
    budget?: string;
    quality?: string;
    risk?: string;
  };
  estimatedCost?: number;
  estimatedDays?: number;
  affectedStages: mongoose.Types.ObjectId[];
  affectedRequirements: mongoose.Types.ObjectId[];
  affectedTasks: mongoose.Types.ObjectId[];
  reviewedBy?: mongoose.Types.ObjectId;
  reviewedAt?: Date;
  reviewNotes?: string;
  clientApproval?: {
    required: boolean;
    status: "pending" | "approved" | "rejected";
    approvedAt?: Date;
    responseNotes?: string;
  };
  implementationNotes?: string;
  implementedAt?: Date;
  implementedBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const ChangeRequestSchema = new Schema<IChangeRequest>(
  {
    project: { type: Schema.Types.ObjectId, ref: "Project", required: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true },
    type: { type: String, enum: ["scope", "timeline", "budget", "requirement", "technical", "other"], required: true },
    status: {
      type: String,
      enum: ["draft", "submitted", "under-review", "approved", "rejected", "implemented"],
      default: "draft",
    },
    priority: { type: String, enum: ["low", "medium", "high", "urgent"], default: "medium" },
    requestedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    requestedFor: { type: Schema.Types.ObjectId, ref: "User" },
    reason: { type: String, required: true },
    impact: {
      scope: String,
      timeline: String,
      budget: String,
      quality: String,
      risk: String,
    },
    estimatedCost: { type: Number, min: 0 },
    estimatedDays: { type: Number, min: 0 },
    affectedStages: [{ type: Schema.Types.ObjectId, ref: "ProjectStage" }],
    affectedRequirements: [{ type: Schema.Types.ObjectId, ref: "ProjectRequirement" }],
    affectedTasks: [{ type: Schema.Types.ObjectId, ref: "Task" }],
    reviewedBy: { type: Schema.Types.ObjectId, ref: "User" },
    reviewedAt: Date,
    reviewNotes: String,
    clientApproval: {
      required: { type: Boolean, default: false },
      status: { type: String, enum: ["pending", "approved", "rejected"], default: "pending" },
      approvedAt: Date,
      responseNotes: String,
    },
    implementationNotes: String,
    implementedAt: Date,
    implementedBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

ChangeRequestSchema.index({ project: 1 });
ChangeRequestSchema.index({ status: 1 });
ChangeRequestSchema.index({ project: 1, status: 1 });

export default mongoose.models.ChangeRequest ||
  mongoose.model<IChangeRequest>("ChangeRequest", ChangeRequestSchema);
