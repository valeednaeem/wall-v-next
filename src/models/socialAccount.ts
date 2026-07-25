import mongoose, { Schema, Document } from "mongoose";

export interface ISocialAccount extends Document {
  user: mongoose.Types.ObjectId;
  provider: "google" | "github" | "facebook" | "twitter" | "linkedin";
  providerId: string;
  email?: string;
  name?: string;
  avatar?: string;
  accessToken?: string;
  refreshToken?: string;
  expiresAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const SocialAccountSchema = new Schema<ISocialAccount>(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    provider: {
      type: String,
      enum: ["google", "github", "facebook", "twitter", "linkedin"],
      required: true,
    },
    providerId: { type: String, required: true },
    email: String,
    name: String,
    avatar: String,
    accessToken: { type: String, select: false },
    refreshToken: { type: String, select: false },
    expiresAt: Date,
  },
  { timestamps: true }
);

SocialAccountSchema.index({ user: 1 });
SocialAccountSchema.index({ provider: 1, providerId: 1 }, { unique: true });

export default mongoose.models.SocialAccount ||
  mongoose.model<ISocialAccount>("SocialAccount", SocialAccountSchema);
