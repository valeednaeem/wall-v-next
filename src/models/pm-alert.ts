import mongoose, { Schema, Document, Model } from "mongoose";

export interface IPmAlert extends Document {
  title: string;
  message: string;
  category: "project-intake" | "capacity" | "blocked" | "deadline" | "risk" | "agent-failure" | "tool-failure" | "workflow-failure" | "skill-gap" | "resource-conflict" | "bug" | "deployment" | "approval-required" | "client-action" | "overdue" | "billing" | "system" | "security";
  severity: "info" | "warning" | "high" | "critical";
  status: "active" | "acknowledged" | "resolved" | "dismissed";
  source: "pm" | "system" | "agent" | "automated-check";
  project: mongoose.Types.ObjectId;
  task: mongoose.Types.ObjectId;
  agent: mongoose.Types.ObjectId;
  resource: mongoose.Types.ObjectId;
  resourceType: "user" | "agent" | "tool" | "workflow";
  actionRequired: boolean;
  approvalRequired: boolean;
  assignedTo: mongoose.Types.ObjectId;
  acknowledgedBy: mongoose.Types.ObjectId;
  acknowledgedAt: Date;
  resolvedAt: Date;
  resolution: string;
  metadata: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

const PmAlertSchema = new Schema<IPmAlert>(
  {
    title: { type: String, required: true, trim: true },
    message: { type: String, required: true },
    category: { type: String, enum: ["project-intake", "capacity", "blocked", "deadline", "risk", "agent-failure", "tool-failure", "workflow-failure", "skill-gap", "resource-conflict", "bug", "deployment", "approval-required", "client-action", "overdue", "billing", "system", "security"], required: true, index: true },
    severity: { type: String, enum: ["info", "warning", "high", "critical"], default: "warning", index: true },
    status: { type: String, enum: ["active", "acknowledged", "resolved", "dismissed"], default: "active", index: true },
    source: { type: String, enum: ["pm", "system", "agent", "automated-check"], default: "pm" },
    project: { type: Schema.Types.ObjectId, ref: "Project", index: true },
    task: { type: Schema.Types.ObjectId, ref: "Task" },
    agent: { type: Schema.Types.ObjectId, ref: "Agent" },
    resource: { type: Schema.Types.ObjectId },
    resourceType: { type: String, enum: ["user", "agent", "tool", "workflow"] },
    actionRequired: { type: Boolean, default: false },
    approvalRequired: { type: Boolean, default: false },
    assignedTo: { type: Schema.Types.ObjectId, ref: "User" },
    acknowledgedBy: { type: Schema.Types.ObjectId, ref: "User" },
    acknowledgedAt: Date,
    resolvedAt: Date,
    resolution: { type: String, default: "" },
    metadata: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

PmAlertSchema.index({ status: 1, severity: 1 });
PmAlertSchema.index({ assignedTo: 1, status: 1 });

export default (mongoose.models.PmAlert as Model<IPmAlert>) || mongoose.model<IPmAlert>("PmAlert", PmAlertSchema);
