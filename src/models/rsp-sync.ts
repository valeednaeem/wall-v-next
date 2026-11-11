import mongoose, { Schema, Document } from "mongoose";

export interface IRspSync extends Document {
  type: "plans" | "domains" | "accounts" | "billing";
  status: "success" | "failed" | "pending";
  data?: Record<string, unknown>;
  error?: string;
  createdAt: Date;
}

const RspSyncSchema = new Schema<IRspSync>(
  {
    type: {
      type: String,
      enum: ["plans", "domains", "accounts", "billing"],
      required: true,
    },
    status: {
      type: String,
      enum: ["success", "failed", "pending"],
      default: "pending",
    },
    data: { type: Schema.Types.Mixed },
    error: String,
  },
  { timestamps: true }
);

RspSyncSchema.index({ type: 1 });
RspSyncSchema.index({ createdAt: -1 });

export default mongoose.models.RspSync ||
  mongoose.model<IRspSync>("RspSync", RspSyncSchema);
