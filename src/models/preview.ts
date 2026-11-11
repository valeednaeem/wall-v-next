import mongoose, { Schema, Document } from "mongoose";
import crypto from "crypto";

export interface IPreview extends Document {
  projectId: mongoose.Types.ObjectId;
  milestoneIndex?: number;
  token: string;
  tokenHash: string;
  status: "active" | "expired" | "revoked" | "paid";
  expiresAt: Date;
  createdAt: Date;
  lastAccessedAt?: Date;
  accessCount: number;
  maxAccesses: number;
  paymentRequired: boolean;
  paymentStatus: "unpaid" | "paid";
  createdBy?: mongoose.Types.ObjectId;
  accessLog: {
    timestamp: Date;
    event: string;
    ip?: string;
    userAgent?: string;
    details?: string;
  }[];
}

function generateSecureToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

const PreviewSchema = new Schema<IPreview>(
  {
    projectId: { type: Schema.Types.ObjectId, ref: "Project", required: true, index: true },
    milestoneIndex: { type: Number },
    token: { type: String, required: true, unique: true },
    tokenHash: { type: String, required: true, unique: true, index: true },
    status: {
      type: String,
      enum: ["active", "expired", "revoked", "paid"],
      default: "active",
    },
    expiresAt: { type: Date, required: true, index: true },
    lastAccessedAt: Date,
    accessCount: { type: Number, default: 0 },
    maxAccesses: { type: Number, default: 10 },
    paymentRequired: { type: Boolean, default: true },
    paymentStatus: { type: String, enum: ["unpaid", "paid"], default: "unpaid" },
    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
    accessLog: [
      {
        timestamp: { type: Date, default: Date.now },
        event: { type: String, required: true },
        ip: String,
        userAgent: String,
        details: String,
      },
    ],
  },
  { timestamps: true }
);

PreviewSchema.index({ projectId: 1, status: 1 });
PreviewSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export function createPreviewToken(): { token: string; tokenHash: string } {
  const token = generateSecureToken();
  const tokenHash = hashToken(token);
  return { token, tokenHash };
}

export function verifyPreviewToken(token: string, storedHash: string): boolean {
  return hashToken(token) === storedHash;
}

export default mongoose.models.Preview ||
  mongoose.model<IPreview>("Preview", PreviewSchema);
