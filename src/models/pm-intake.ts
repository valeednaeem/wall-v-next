import mongoose, { Schema, Document, Model } from "mongoose";

export interface IPmIntake extends Document {
  source: "inquiry" | "chat" | "voice" | "whatsapp" | "admin" | "client-dashboard" | "manual" | "lead" | "service-request" | "order";
  sourceRef: mongoose.Types.ObjectId;
  client: mongoose.Types.ObjectId;
  clientName: string;
  clientEmail: string;
  title: string;
  description: string;
  requirements: string[];
  deliverables: string[];
  requiredSkills: string[];
  requiredTools: string[];
  requiredWorkflows: string[];
  requiredAgents: mongoose.Types.ObjectId[];
  requiredHumanResources: mongoose.Types.ObjectId[];
  priority: "low" | "medium" | "high" | "urgent";
  estimatedEffort: number;
  estimatedDuration: string;
  targetDate: Date;
  estimatedBudget: number;
  dependencies: string[];
  constraints: string[];
  assumptions: string[];
  riskIndicators: string[];
  triageStatus: "pending" | "ready" | "needs-information" | "needs-approval" | "resource-conflict" | "over-capacity" | "blocked" | "high-risk" | "rejected" | "on-hold";
  triageReason: string;
  triagedBy: mongoose.Types.ObjectId;
  triagedByType: "user" | "ai" | "system";
  triagedAt: Date;
  admissionDecision: "accept" | "accept-with-warning" | "queue" | "defer" | "request-more-resources" | "request-admin-approval" | "reject";
  admissionReason: string;
  projectId: mongoose.Types.ObjectId;
  convertedAt: Date;
  metadata: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

const PmIntakeSchema = new Schema<IPmIntake>(
  {
    source: { type: String, enum: ["inquiry", "chat", "voice", "whatsapp", "admin", "client-dashboard", "manual", "lead", "service-request", "order"], required: true, index: true },
    sourceRef: { type: Schema.Types.ObjectId, refPath: "source" },
    client: { type: Schema.Types.ObjectId, ref: "Client", index: true },
    clientName: { type: String, default: "" },
    clientEmail: { type: String, default: "" },
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true },
    requirements: [String],
    deliverables: [String],
    requiredSkills: [String],
    requiredTools: [String],
    requiredWorkflows: [String],
    requiredAgents: [{ type: Schema.Types.ObjectId, ref: "Agent" }],
    requiredHumanResources: [{ type: Schema.Types.ObjectId, ref: "User" }],
    priority: { type: String, enum: ["low", "medium", "high", "urgent"], default: "medium" },
    estimatedEffort: { type: Number, default: 0 },
    estimatedDuration: { type: String, default: "" },
    targetDate: Date,
    estimatedBudget: { type: Number, default: 0 },
    dependencies: [String],
    constraints: [String],
    assumptions: [String],
    riskIndicators: [String],
    triageStatus: { type: String, enum: ["pending", "ready", "needs-information", "needs-approval", "resource-conflict", "over-capacity", "blocked", "high-risk", "rejected", "on-hold"], default: "pending", index: true },
    triageReason: { type: String, default: "" },
    triagedBy: { type: Schema.Types.ObjectId, refPath: "triagedByType" },
    triagedByType: { type: String, enum: ["user", "ai", "system"], default: "ai" },
    triagedAt: Date,
    admissionDecision: { type: String, enum: ["accept", "accept-with-warning", "queue", "defer", "request-more-resources", "request-admin-approval", "reject"], default: "accept" },
    admissionReason: { type: String, default: "" },
    projectId: { type: Schema.Types.ObjectId, ref: "Project" },
    convertedAt: Date,
    metadata: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

PmIntakeSchema.index({ triageStatus: 1, priority: 1 });
PmIntakeSchema.index({ source: 1, createdAt: -1 });

export default (mongoose.models.PmIntake as Model<IPmIntake>) || mongoose.model<IPmIntake>("PmIntake", PmIntakeSchema);
