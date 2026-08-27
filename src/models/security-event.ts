import mongoose, { Schema, Document } from "mongoose";

export interface ISecurityEvent extends Document {
  type: string;
  severity: "low" | "medium" | "high" | "critical";
  userId?: string;
  email?: string;
  ip: string;
  userAgent?: string;
  path?: string;
  method?: string;
  details?: Record<string, unknown>;
  blocked: boolean;
  createdAt: Date;
}

const SecurityEventSchema = new Schema<ISecurityEvent>(
  {
    type: { type: String, required: true, index: true },
    severity: { type: String, enum: ["low", "medium", "high", "critical"], default: "medium", index: true },
    userId: { type: String, index: true },
    email: { type: String, index: true },
    ip: { type: String, required: true, index: true },
    userAgent: String,
    path: String,
    method: String,
    details: Schema.Types.Mixed,
    blocked: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// TTL index — auto-delete after 90 days
SecurityEventSchema.index({ createdAt: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60 });

// Compound indexes for common queries
SecurityEventSchema.index({ type: 1, createdAt: -1 });
SecurityEventSchema.index({ ip: 1, type: 1, createdAt: -1 });
SecurityEventSchema.index({ severity: 1, createdAt: -1 });

export default mongoose.models.SecurityEvent ||
  mongoose.model<ISecurityEvent>("SecurityEvent", SecurityEventSchema);
