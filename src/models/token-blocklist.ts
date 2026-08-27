import mongoose, { Schema, Document } from "mongoose";

export interface ITokenBlocklist extends Document {
  tokenHash: string;
  userId: string;
  reason: "logout" | "password_change" | "role_change" | "account_suspension" | "security";
  expiresAt: Date;
  createdAt: Date;
}

const TokenBlocklistSchema = new Schema<ITokenBlocklist>(
  {
    tokenHash: { type: String, required: true, index: true },
    userId: { type: String, required: true, index: true },
    reason: {
      type: String,
      enum: ["logout", "password_change", "role_change", "account_suspension", "security"],
      required: true,
    },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true }
);

// TTL index — auto-delete when token would have expired naturally
TokenBlocklistSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
// Fast lookup by userId for bulk invalidation
TokenBlocklistSchema.index({ userId: 1, reason: 1 });

export default mongoose.models.TokenBlocklist ||
  mongoose.model<ITokenBlocklist>("TokenBlocklist", TokenBlocklistSchema);
