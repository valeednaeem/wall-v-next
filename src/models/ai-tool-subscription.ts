import mongoose, { Schema, Document } from "mongoose";

export interface IAIToolSubscription extends Document {
  user: mongoose.Types.ObjectId;
  plan: mongoose.Types.ObjectId;
  status: "active" | "expired" | "cancelled";
  billing: "monthly" | "yearly";
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  creditsRemaining: number;
  convertedViaTool?: mongoose.Types.ObjectId;
  pricePaid: number;
  createdAt: Date;
  updatedAt: Date;
}

const AIToolSubscriptionSchema = new Schema<IAIToolSubscription>(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    plan: { type: Schema.Types.ObjectId, ref: "AIToolPlan", required: true },
    status: {
      type: String,
      enum: ["active", "expired", "cancelled"],
      default: "active",
    },
    billing: { type: String, enum: ["monthly", "yearly"], default: "monthly" },
    currentPeriodStart: { type: Date, required: true },
    currentPeriodEnd: { type: Date, required: true },
    creditsRemaining: { type: Number, default: 0, min: -1 },
    convertedViaTool: { type: Schema.Types.ObjectId, ref: "AITool" },
    pricePaid: { type: Number, default: 0, min: 0 },
  },
  { timestamps: true }
);

AIToolSubscriptionSchema.index({ user: 1, status: 1 });
AIToolSubscriptionSchema.index({ plan: 1 });
AIToolSubscriptionSchema.index({ convertedViaTool: 1 });

export default mongoose.models.AIToolSubscription ||
  mongoose.model<IAIToolSubscription>("AIToolSubscription", AIToolSubscriptionSchema);
