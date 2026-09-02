import mongoose, { Schema, Document, Model } from "mongoose";

export interface IPmAuditLog extends Document {
  action: string;
  category: "intake" | "triage" | "planning" | "assignment" | "execution" | "monitoring" | "risk" | "issue" | "approval" | "alert" | "report" | "capacity" | "config" | "system";
  description: string;
  actor: mongoose.Types.ObjectId;
  actorType: "user" | "ai" | "system";
  agent: mongoose.Types.ObjectId;
  project: mongoose.Types.ObjectId;
  task: mongoose.Types.ObjectId;
  risk: mongoose.Types.ObjectId;
  issue: mongoose.Types.ObjectId;
  alert: mongoose.Types.ObjectId;
  changes: {
    field: string;
    oldValue: unknown;
    newValue: unknown;
  }[];
  reasoning: string;
  confidence: number;
  toolUsed: string;
  workflowUsed: string;
  result: "success" | "failure" | "partial" | "pending";
  error: string;
  duration: number;
  metadata: Record<string, unknown>;
  createdAt: Date;
}

const PmAuditLogSchema = new Schema<IPmAuditLog>(
  {
    action: { type: String, required: true, index: true },
    category: { type: String, enum: ["intake", "triage", "planning", "assignment", "execution", "monitoring", "risk", "issue", "approval", "alert", "report", "capacity", "config", "system"], required: true, index: true },
    description: { type: String, required: true },
    actor: { type: Schema.Types.ObjectId, refPath: "actorType" },
    actorType: { type: String, enum: ["user", "ai", "system"], default: "ai" },
    agent: { type: Schema.Types.ObjectId, ref: "Agent" },
    project: { type: Schema.Types.ObjectId, ref: "Project", index: true },
    task: { type: Schema.Types.ObjectId, ref: "Task" },
    risk: { type: Schema.Types.ObjectId, ref: "PmRisk" },
    issue: { type: Schema.Types.ObjectId, ref: "PmIssue" },
    alert: { type: Schema.Types.ObjectId, ref: "PmAlert" },
    changes: [
      {
        field: { type: String },
        oldValue: { type: Schema.Types.Mixed },
        newValue: { type: Schema.Types.Mixed },
      },
    ],
    reasoning: { type: String, default: "" },
    confidence: { type: Number, min: 0, max: 1, default: 1 },
    toolUsed: { type: String, default: "" },
    workflowUsed: { type: String, default: "" },
    result: { type: String, enum: ["success", "failure", "partial", "pending"], default: "success" },
    error: { type: String, default: "" },
    duration: { type: Number, default: 0 },
    metadata: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

PmAuditLogSchema.index({ category: 1, createdAt: -1 });
PmAuditLogSchema.index({ project: 1, createdAt: -1 });
PmAuditLogSchema.index({ actor: 1, createdAt: -1 });

export default (mongoose.models.PmAuditLog as Model<IPmAuditLog>) || mongoose.model<IPmAuditLog>("PmAuditLog", PmAuditLogSchema);
