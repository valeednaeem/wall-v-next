import mongoose, { Schema, Document } from "mongoose";

export interface IAIToolExecution extends Document {
  tool: mongoose.Types.ObjectId;
  user?: mongoose.Types.ObjectId;
  sessionId?: string;
  ip?: string;
  userAgent?: string;
  accessModel: string;
  status: "started" | "success" | "failed" | "timeout";
  creditsConsumed: number;
  provider?: mongoose.Types.ObjectId;
  aiModel?: string;
  inputTokens?: number;
  outputTokens?: number;
  durationMs?: number;
  errorType?: string;
  errorMessage?: string;
  estimatedCost?: number;
  metadata?: Record<string, unknown>;
  createdAt: Date;
}

const AIToolExecutionSchema = new Schema<IAIToolExecution>(
  {
    tool: { type: Schema.Types.ObjectId, ref: "AITool", required: true },
    user: { type: Schema.Types.ObjectId, ref: "User" },
    sessionId: { type: String },
    ip: { type: String },
    userAgent: { type: String },
    accessModel: { type: String, default: "free" },
    status: { type: String, enum: ["started", "success", "failed", "timeout"], required: true },
    creditsConsumed: { type: Number, default: 0, min: 0 },
    provider: { type: Schema.Types.ObjectId, ref: "AIToolProvider" },
    aiModel: { type: String },
    inputTokens: { type: Number, min: 0 },
    outputTokens: { type: Number, min: 0 },
    durationMs: { type: Number, min: 0 },
    errorType: { type: String },
    errorMessage: { type: String },
    estimatedCost: { type: Number, min: 0 },
    metadata: { type: Schema.Types.Mixed },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

AIToolExecutionSchema.index({ tool: 1, createdAt: -1 });
AIToolExecutionSchema.index({ user: 1, createdAt: -1 });
AIToolExecutionSchema.index({ status: 1, createdAt: -1 });
AIToolExecutionSchema.index({ createdAt: 1 }, { expireAfterSeconds: 180 * 24 * 60 * 60 });

export default mongoose.models.AIToolExecution ||
  mongoose.model<IAIToolExecution>("AIToolExecution", AIToolExecutionSchema);
