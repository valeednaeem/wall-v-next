import mongoose, { Schema, Document } from "mongoose";

export interface IGoogleOAuthToken extends Document {
  userId: mongoose.Types.ObjectId;
  email: string;
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
  scope: string[];
  tokenType: string;
  createdAt: Date;
  updatedAt: Date;
}

const GoogleOAuthTokenSchema = new Schema<IGoogleOAuthToken>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    email: { type: String, required: true },
    accessToken: { type: String, required: true },
    refreshToken: { type: String, required: true },
    expiresAt: { type: Date, required: true },
    scope: [{ type: String }],
    tokenType: { type: String, default: "Bearer" },
  },
  { timestamps: true }
);

GoogleOAuthTokenSchema.index({ userId: 1, email: 1 }, { unique: true });
GoogleOAuthTokenSchema.index({ expiresAt: 1 });

export default mongoose.models.GoogleOAuthToken ||
  mongoose.model<IGoogleOAuthToken>("GoogleOAuthToken", GoogleOAuthTokenSchema);