import mongoose, { Schema, Document } from "mongoose";

export interface IProjectActivity extends Document {
  project: mongoose.Types.ObjectId;
  actor: mongoose.Types.ObjectId;
  actorType: "user" | "ai" | "system" | "client";
  action: string;
  category: "project" | "stage" | "task" | "requirement" | "change-request" | "quotation" | "invoice" | "payment" | "communication" | "deliverable" | "approval" | "system";
  description: string;
  entity?: {
    model: string;
    id: mongoose.Types.ObjectId;
  };
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  createdAt: Date;
}

const ProjectActivitySchema = new Schema<IProjectActivity>(
  {
    project: { type: Schema.Types.ObjectId, ref: "Project", required: true },
    actor: { type: Schema.Types.ObjectId, ref: "User" },
    actorType: { type: String, enum: ["user", "ai", "system", "client"], default: "user" },
    action: { type: String, required: true },
    category: {
      type: String,
      enum: ["project", "stage", "task", "requirement", "change-request", "quotation", "invoice", "payment", "communication", "deliverable", "approval", "system"],
      required: true,
    },
    description: { type: String, required: true },
    entity: {
      model: String,
      id: { type: Schema.Types.ObjectId },
    },
    before: Schema.Types.Mixed,
    after: Schema.Types.Mixed,
    metadata: Schema.Types.Mixed,
    ipAddress: String,
    userAgent: String,
  },
  { timestamps: true }
);

ProjectActivitySchema.index({ project: 1 });
ProjectActivitySchema.index({ project: 1, createdAt: -1 });
ProjectActivitySchema.index({ actor: 1 });
ProjectActivitySchema.index({ category: 1 });

export default mongoose.models.ProjectActivity ||
  mongoose.model<IProjectActivity>("ProjectActivity", ProjectActivitySchema);
