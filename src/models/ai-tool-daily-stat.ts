import mongoose, { Schema, Document } from "mongoose";

export interface IAIToolFunnel {
  views: number;
  started: number;
  attempted: number;
  succeeded: number;
  upgradePrompts: number;
  conversions: number;
}

export interface IAIToolDailyStat extends Document {
  date: Date;
  tool: mongoose.Types.ObjectId;
  category?: mongoose.Types.ObjectId;
  accessModel: string;
  executions: number;
  successCount: number;
  failureCount: number;
  uniqueUsers: number;
  credits: number;
  estimatedCost: number;
  revenue: number;
  funnel: IAIToolFunnel;
  updatedAt: Date;
}

const AIToolDailyStatSchema = new Schema<IAIToolDailyStat>(
  {
    date: { type: Date, required: true },
    tool: { type: Schema.Types.ObjectId, ref: "AITool", required: true },
    category: { type: Schema.Types.ObjectId, ref: "AIToolCategory" },
    accessModel: { type: String, default: "free" },
    executions: { type: Number, default: 0 },
    successCount: { type: Number, default: 0 },
    failureCount: { type: Number, default: 0 },
    uniqueUsers: { type: Number, default: 0 },
    credits: { type: Number, default: 0 },
    estimatedCost: { type: Number, default: 0 },
    revenue: { type: Number, default: 0 },
    funnel: {
      views: { type: Number, default: 0 },
      started: { type: Number, default: 0 },
      attempted: { type: Number, default: 0 },
      succeeded: { type: Number, default: 0 },
      upgradePrompts: { type: Number, default: 0 },
      conversions: { type: Number, default: 0 },
    },
  },
  { timestamps: { createdAt: false, updatedAt: true } }
);

AIToolDailyStatSchema.index({ date: -1 });
AIToolDailyStatSchema.index({ tool: 1, date: -1 });
AIToolDailyStatSchema.index({ date: 1, tool: 1 }, { unique: true });

export default mongoose.models.AIToolDailyStat ||
  mongoose.model<IAIToolDailyStat>("AIToolDailyStat", AIToolDailyStatSchema);
