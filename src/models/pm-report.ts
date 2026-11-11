import mongoose, { Schema, Document, Model } from "mongoose";

export interface IPmReport extends Document {
  title: string;
  type: "daily-ops" | "weekly-mgmt" | "app-health" | "project-status" | "capacity" | "risk-summary" | "agent-performance" | "custom";
  period: string;
  date: Date;
  generatedBy: mongoose.Types.ObjectId;
  generatedByType: "user" | "ai" | "system";
  status: "generating" | "completed" | "failed";
  summary: string;
  sections: {
    title: string;
    content: string;
    data: Record<string, unknown>;
  }[];
  metrics: {
    name: string;
    value: number | string;
    unit: string;
    trend: "up" | "down" | "stable";
    previousValue: number | string;
  }[];
  recipients: mongoose.Types.ObjectId[];
  sentAt: Date;
  metadata: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

const PmReportSchema = new Schema<IPmReport>(
  {
    title: { type: String, required: true, trim: true },
    type: { type: String, enum: ["daily-ops", "weekly-mgmt", "app-health", "project-status", "capacity", "risk-summary", "agent-performance", "custom"], required: true, index: true },
    period: { type: String, required: true },
    date: { type: Date, required: true, index: true },
    generatedBy: { type: Schema.Types.ObjectId, refPath: "generatedByType" },
    generatedByType: { type: String, enum: ["user", "ai", "system"], default: "ai" },
    status: { type: String, enum: ["generating", "completed", "failed"], default: "generating" },
    summary: { type: String, default: "" },
    sections: [
      {
        title: { type: String, required: true },
        content: { type: String, default: "" },
        data: { type: Schema.Types.Mixed, default: {} },
      },
    ],
    metrics: [
      {
        name: { type: String, required: true },
        value: { type: Schema.Types.Mixed },
        unit: { type: String, default: "" },
        trend: { type: String, enum: ["up", "down", "stable"], default: "stable" },
        previousValue: { type: Schema.Types.Mixed },
      },
    ],
    recipients: [{ type: Schema.Types.ObjectId, ref: "User" }],
    sentAt: Date,
    metadata: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

PmReportSchema.index({ type: 1, date: -1 });

export default (mongoose.models.PmReport as Model<IPmReport>) || mongoose.model<IPmReport>("PmReport", PmReportSchema);
