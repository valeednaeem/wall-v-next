import mongoose, { Schema, Document, Model } from "mongoose";

export interface IPmIssue extends Document {
  project: mongoose.Types.ObjectId;
  title: string;
  description: string;
  category: "bug" | "feature-gap" | "workflow-gap" | "config-mismatch" | "permission-error" | "api-failure" | "build-failure" | "deployment-failure" | "data-inconsistency" | "performance" | "security" | "other";
  severity: "info" | "warning" | "bug" | "critical" | "security" | "blocker";
  status: "detected" | "triaged" | "assigned" | "in-progress" | "resolved" | "closed" | "wont-fix" | "duplicate";
  source: "pm-scan" | "agent-report" | "user-report" | "automated-check" | "client-report" | "build-system";
  assignedTo: mongoose.Types.ObjectId;
  assignedToType: "user" | "agent";
  reportedBy: mongoose.Types.ObjectId;
  reportedByType: "user" | "ai" | "system";
  resolution: string;
  resolvedAt: Date;
  affectedComponents: string[];
  reproductionSteps: string[];
  expectedBehavior: string;
  actualBehavior: string;
  environment: string;
  relatedRisks: mongoose.Types.ObjectId[];
  priority: "low" | "medium" | "high" | "urgent";
  dueDate: Date;
  metadata: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

const PmIssueSchema = new Schema<IPmIssue>(
  {
    project: { type: Schema.Types.ObjectId, ref: "Project", index: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true },
    category: { type: String, enum: ["bug", "feature-gap", "workflow-gap", "config-mismatch", "permission-error", "api-failure", "build-failure", "deployment-failure", "data-inconsistency", "performance", "security", "other"], required: true, index: true },
    severity: { type: String, enum: ["info", "warning", "bug", "critical", "security", "blocker"], default: "bug", index: true },
    status: { type: String, enum: ["detected", "triaged", "assigned", "in-progress", "resolved", "closed", "wont-fix", "duplicate"], default: "detected", index: true },
    source: { type: String, enum: ["pm-scan", "agent-report", "user-report", "automated-check", "client-report", "build-system"], default: "pm-scan" },
    assignedTo: { type: Schema.Types.ObjectId, refPath: "assignedToType" },
    assignedToType: { type: String, enum: ["user", "agent"], default: "user" },
    reportedBy: { type: Schema.Types.ObjectId, refPath: "reportedByType" },
    reportedByType: { type: String, enum: ["user", "ai", "system"], default: "ai" },
    resolution: { type: String, default: "" },
    resolvedAt: Date,
    affectedComponents: [String],
    reproductionSteps: [String],
    expectedBehavior: { type: String, default: "" },
    actualBehavior: { type: String, default: "" },
    environment: { type: String, default: "" },
    relatedRisks: [{ type: Schema.Types.ObjectId, ref: "PmRisk" }],
    priority: { type: String, enum: ["low", "medium", "high", "urgent"], default: "medium", index: true },
    dueDate: Date,
    metadata: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

PmIssueSchema.index({ severity: 1, status: 1 });
PmIssueSchema.index({ project: 1, status: 1 });

export default (mongoose.models.PmIssue as Model<IPmIssue>) || mongoose.model<IPmIssue>("PmIssue", PmIssueSchema);
