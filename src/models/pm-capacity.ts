import mongoose, { Schema, Document, Model } from "mongoose";

export interface IPmCapacity extends Document {
  resource: mongoose.Types.ObjectId;
  resourceType: "user" | "agent";
  period: string;
  date: Date;
  totalCapacityHours: number;
  allocatedHours: number;
  utilizedHours: number;
  remainingHours: number;
  utilizationPercent: number;
  status: "available" | "near-capacity" | "at-capacity" | "overloaded";
  assignments: {
    project: mongoose.Types.ObjectId;
    task: mongoose.Types.ObjectId;
    estimatedHours: number;
    actualHours: number;
    status: string;
  }[];
  metadata: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

const PmCapacitySchema = new Schema<IPmCapacity>(
  {
    resource: { type: Schema.Types.ObjectId, required: true, refPath: "resourceType", index: true },
    resourceType: { type: String, enum: ["user", "agent"], required: true },
    period: { type: String, required: true },
    date: { type: Date, required: true, index: true },
    totalCapacityHours: { type: Number, default: 0 },
    allocatedHours: { type: Number, default: 0 },
    utilizedHours: { type: Number, default: 0 },
    remainingHours: { type: Number, default: 0 },
    utilizationPercent: { type: Number, default: 0 },
    status: { type: String, enum: ["available", "near-capacity", "at-capacity", "overloaded"], default: "available", index: true },
    assignments: [
      {
        project: { type: Schema.Types.ObjectId, ref: "Project" },
        task: { type: Schema.Types.ObjectId, ref: "Task" },
        estimatedHours: { type: Number, default: 0 },
        actualHours: { type: Number, default: 0 },
        status: { type: String, default: "assigned" },
      },
    ],
    metadata: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

PmCapacitySchema.index({ resource: 1, date: 1 }, { unique: true });
PmCapacitySchema.index({ status: 1 });

export default (mongoose.models.PmCapacity as Model<IPmCapacity>) || mongoose.model<IPmCapacity>("PmCapacity", PmCapacitySchema);
