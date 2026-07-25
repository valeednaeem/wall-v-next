import mongoose, { Schema, Document } from "mongoose";

export interface IErrorLog extends Document {
  message: string;
  stack?: string;
  level: "error" | "warning" | "info";
  source?: string;
  userId?: mongoose.Types.ObjectId;
  metadata?: Record<string, unknown>;
  userAgent?: string;
  resolved: boolean;
  createdAt: Date;
}

const ErrorLogSchema = new Schema<IErrorLog>(
  {
    message: { type: String, required: true },
    stack: String,
    level: { type: String, enum: ["error", "warning", "info"], default: "error" },
    source: String,
    userId: { type: Schema.Types.ObjectId, ref: "User" },
    metadata: { type: Schema.Types.Mixed },
    userAgent: String,
    resolved: { type: Boolean, default: false },
  },
  { timestamps: true }
);

ErrorLogSchema.index({ level: 1 });
ErrorLogSchema.index({ createdAt: -1 });

export default mongoose.models.ErrorLog ||
  mongoose.model<IErrorLog>("ErrorLog", ErrorLogSchema);
