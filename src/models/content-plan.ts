import mongoose, { Schema, Document } from "mongoose";

export interface IContentPlan extends Document {
  campaign: mongoose.Types.ObjectId;
  weekNumber: number;
  startDate: Date;
  endDate: Date;
  version: number;
  status:
    | "draft"
    | "pending_approval"
    | "changes_requested"
    | "approved"
    | "executing"
    | "completed"
    | "cancelled";
  topics: mongoose.Types.ObjectId[];
  items: mongoose.Types.ObjectId[];
  approvedBy?: mongoose.Types.ObjectId;
  approvedAt?: Date;
  rejectionReason?: string;
  changeRequests: {
    message: string;
    requestedBy: mongoose.Types.ObjectId;
    requestedAt: Date;
  }[];
  auditTrail: {
    action: string;
    timestamp: Date;
    actor: mongoose.Types.ObjectId;
    details?: string;
  }[];
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const ContentPlanSchema = new Schema<IContentPlan>(
  {
    campaign: {
      type: Schema.Types.ObjectId,
      ref: "ContentCampaign",
      required: true,
    },
    weekNumber: { type: Number, required: true },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    version: { type: Number, default: 1 },
    status: {
      type: String,
      enum: [
        "draft",
        "pending_approval",
        "changes_requested",
        "approved",
        "executing",
        "completed",
        "cancelled",
      ],
      default: "draft",
    },
    topics: [{ type: Schema.Types.ObjectId, ref: "ContentTopic" }],
    items: [{ type: Schema.Types.ObjectId, ref: "ContentItem" }],
    approvedBy: { type: Schema.Types.ObjectId, ref: "User" },
    approvedAt: Date,
    rejectionReason: String,
    changeRequests: [
      {
        message: { type: String, required: true },
        requestedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
        requestedAt: { type: Date, default: Date.now },
      },
    ],
    auditTrail: [
      {
        action: { type: String, required: true },
        timestamp: { type: Date, default: Date.now },
        actor: { type: Schema.Types.ObjectId, ref: "User", required: true },
        details: String,
      },
    ],
    notes: String,
  },
  { timestamps: true }
);

ContentPlanSchema.index({ campaign: 1 });
ContentPlanSchema.index({ weekNumber: 1 });
ContentPlanSchema.index({ status: 1 });
ContentPlanSchema.index({ version: 1 });

export default mongoose.models.ContentPlan ||
  mongoose.model<IContentPlan>("ContentPlan", ContentPlanSchema);
