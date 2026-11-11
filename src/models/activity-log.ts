import mongoose, { Schema, Document } from "mongoose";

export interface IActivityLog extends Document {
  user?: mongoose.Types.ObjectId;
  action: string;
  entity: string;
  entityId?: string;
  details?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  createdAt: Date;
}

const ActivityLogSchema = new Schema<IActivityLog>(
  {
    user: { type: Schema.Types.ObjectId, ref: "User" },
    action: { type: String, required: true },
    entity: { type: String, required: true },
    entityId: String,
    details: { type: Schema.Types.Mixed },
    ipAddress: String,
    userAgent: String,
  },
  { timestamps: true }
);

ActivityLogSchema.index({ user: 1 });
ActivityLogSchema.index({ entity: 1 });
ActivityLogSchema.index({ createdAt: -1 });

export default mongoose.models.ActivityLog ||
  mongoose.model<IActivityLog>("ActivityLog", ActivityLogSchema);
