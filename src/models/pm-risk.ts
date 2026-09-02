import mongoose, { Schema, Document, Model } from "mongoose";

export interface IPmRisk extends Document {
  project: mongoose.Types.ObjectId;
  title: string;
  description: string;
  category: "capacity" | "skill" | "deadline" | "dependency" | "technical" | "resource" | "client" | "financial" | "security" | "operational";
  severity: "low" | "medium" | "high" | "critical";
  probability: "unlikely" | "possible" | "likely" | "almost-certain";
  impact: "negligible" | "minor" | "moderate" | "significant" | "severe";
  status: "identified" | "analyzing" | "mitigating" | "accepted" | "closed" | "realized";
  owner: mongoose.Types.ObjectId;
  mitigation: string;
  contingency: string;
  identifiedBy: mongoose.Types.ObjectId;
  identifiedByType: "user" | "ai" | "system";
  affectedTasks: mongoose.Types.ObjectId[];
  affectedResources: mongoose.Types.ObjectId[];
  resolution: string;
  resolvedAt: Date;
  metadata: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

const PmRiskSchema = new Schema<IPmRisk>(
  {
    project: { type: Schema.Types.ObjectId, ref: "Project", required: true, index: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true },
    category: { type: String, enum: ["capacity", "skill", "deadline", "dependency", "technical", "resource", "client", "financial", "security", "operational"], required: true, index: true },
    severity: { type: String, enum: ["low", "medium", "high", "critical"], default: "medium", index: true },
    probability: { type: String, enum: ["unlikely", "possible", "likely", "almost-certain"], default: "possible" },
    impact: { type: String, enum: ["negligible", "minor", "moderate", "significant", "severe"], default: "moderate" },
    status: { type: String, enum: ["identified", "analyzing", "mitigating", "accepted", "closed", "realized"], default: "identified", index: true },
    owner: { type: Schema.Types.ObjectId, ref: "User" },
    mitigation: { type: String, default: "" },
    contingency: { type: String, default: "" },
    identifiedBy: { type: Schema.Types.ObjectId, refPath: "identifiedByType" },
    identifiedByType: { type: String, enum: ["user", "ai", "system"], default: "ai" },
    affectedTasks: [{ type: Schema.Types.ObjectId, ref: "Task" }],
    affectedResources: [{ type: Schema.Types.ObjectId }],
    resolution: { type: String, default: "" },
    resolvedAt: Date,
    metadata: { type: Schema.Types.ObjectId, ref: "Metadata" },
  },
  { timestamps: true }
);

PmRiskSchema.index({ project: 1, severity: 1 });
PmRiskSchema.index({ status: 1, severity: 1 });

export default (mongoose.models.PmRisk as Model<IPmRisk>) || mongoose.model<IPmRisk>("PmRisk", PmRiskSchema);
