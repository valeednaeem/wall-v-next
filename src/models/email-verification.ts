import mongoose, { Schema, Document } from "mongoose";

export interface IEmailVerification extends Document {
  userId: string;
  email: string;
  token: string;
  expiresAt: Date;
  used: boolean;
  createdAt: Date;
}

const EmailVerificationSchema = new Schema<IEmailVerification>(
  {
    userId: { type: String, required: true, index: true },
    email: { type: String, required: true, lowercase: true },
    token: { type: String, required: true, unique: true },
    expiresAt: { type: Date, required: true },
    used: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// TTL index — auto-delete after 24 hours
EmailVerificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
// Single-use enforcement
EmailVerificationSchema.index({ token: 1, used: 1 });

export default mongoose.models.EmailVerification ||
  mongoose.model<IEmailVerification>("EmailVerification", EmailVerificationSchema);
