import mongoose, { Schema, Document } from "mongoose";

export interface IConsent extends Document {
  user?: mongoose.Types.ObjectId;
  sessionId?: string;
  necessary: boolean;
  analytics: boolean;
  marketing: boolean;
  preferences: boolean;
  ipAddress?: string;
  createdAt: Date;
  updatedAt: Date;
}

const ConsentSchema = new Schema<IConsent>(
  {
    user: { type: Schema.Types.ObjectId, ref: "User" },
    sessionId: String,
    necessary: { type: Boolean, default: true },
    analytics: { type: Boolean, default: false },
    marketing: { type: Boolean, default: false },
    preferences: { type: Boolean, default: false },
    ipAddress: String,
  },
  { timestamps: true }
);

ConsentSchema.index({ user: 1 });
ConsentSchema.index({ sessionId: 1 });

export default mongoose.models.Consent ||
  mongoose.model<IConsent>("Consent", ConsentSchema);
