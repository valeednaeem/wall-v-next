import mongoose, { Schema, Document } from "mongoose";

export interface IErrorLog extends Document {
  message: string;
  stack?: string;
  level: "error" | "warning" | "info" | "critical";
  source?: string;
  userId?: mongoose.Types.ObjectId;
  projectId?: mongoose.Types.ObjectId;
  operation?: string;
  apiTool?: string;
  metadata?: Record<string, unknown>;
  userAgent?: string;
  status: "open" | "investigating" | "resolved" | "ignored";
  retryCount: number;
  lastRetryAt?: Date;
  resolvedAt?: Date;
  resolvedBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const ErrorLogSchema = new Schema<IErrorLog>(
  {
    message: { type: String, required: true },
    stack: String,
    level: { type: String, enum: ["error", "warning", "info", "critical"], default: "error" },
    source: String,
    userId: { type: Schema.Types.ObjectId, ref: "User" },
    projectId: { type: Schema.Types.ObjectId, ref: "Project" },
    operation: String,
    apiTool: String,
    metadata: { type: Schema.Types.Mixed },
    userAgent: String,
    status: { type: String, enum: ["open", "investigating", "resolved", "ignored"], default: "open" },
    retryCount: { type: Number, default: 0 },
    lastRetryAt: Date,
    resolvedAt: Date,
    resolvedBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

ErrorLogSchema.index({ level: 1 });
ErrorLogSchema.index({ status: 1 });
ErrorLogSchema.index({ createdAt: -1 });
ErrorLogSchema.index({ projectId: 1 });
ErrorLogSchema.index({ source: 1 });

export default mongoose.models.ErrorLog ||
  mongoose.model<IErrorLog>("ErrorLog", ErrorLogSchema);
