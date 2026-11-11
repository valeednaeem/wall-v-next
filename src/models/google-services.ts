import mongoose, { Schema, Document } from "mongoose";

export interface IGoogleServiceConfig extends Document {
  serviceId: string;
  name: string;
  enabled: boolean;
  config: Record<string, unknown>;
  credentials?: {
    accessToken?: string;
    refreshToken?: string;
    expiresAt?: Date;
    scope?: string[];
  };
  status: "not_configured" | "config_required" | "auth_required" | "connected" | "connection_failed" | "token_expired" | "permission_denied" | "syncing" | "sync_completed" | "sync_failed";
  lastTested?: Date;
  lastSynced?: Date;
  lastError?: string;
  details?: Record<string, string>;
  createdAt: Date;
  updatedAt: Date;
}

const GoogleServiceConfigSchema = new Schema<IGoogleServiceConfig>(
  {
    serviceId: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    enabled: { type: Boolean, default: false },
    config: { type: Schema.Types.Mixed, default: {} },
    credentials: {
      accessToken: String,
      refreshToken: String,
      expiresAt: Date,
      scope: [String],
    },
    status: {
      type: String,
      enum: [
        "not_configured",
        "config_required",
        "auth_required",
        "connected",
        "connection_failed",
        "token_expired",
        "permission_denied",
        "syncing",
        "sync_completed",
        "sync_failed",
      ],
      default: "not_configured",
    },
    lastTested: Date,
    lastSynced: Date,
    lastError: String,
    details: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

GoogleServiceConfigSchema.index({ serviceId: 1 });
GoogleServiceConfigSchema.index({ enabled: 1 });

export default mongoose.models.GoogleServiceConfig ||
  mongoose.model<IGoogleServiceConfig>("GoogleServiceConfig", GoogleServiceConfigSchema);