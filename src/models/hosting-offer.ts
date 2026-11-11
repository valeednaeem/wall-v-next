import mongoose, { Schema, Document } from "mongoose";

export interface IHostingOffer extends Document {
  planId: string;
  provider: "resellerspanel" | "websouls";
  name: string;
  originalPrice: number;
  offerPrice: number;
  discount: number;
  currency: string;
  description: string;
  isActive: boolean;
  validUntil?: Date;
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const hostingOfferSchema = new Schema<IHostingOffer>(
  {
    planId: { type: String, required: true, trim: true },
    provider: { type: String, enum: ["resellerspanel", "websouls"], required: true },
    name: { type: String, required: true, trim: true },
    originalPrice: { type: Number, required: true, min: 0 },
    offerPrice: { type: Number, required: true, min: 0 },
    discount: { type: Number, required: true, min: 0, max: 100 },
    currency: { type: String, required: true, default: "USD" },
    description: { type: String, default: "" },
    isActive: { type: Boolean, default: true },
    validUntil: { type: Date },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

hostingOfferSchema.index({ planId: 1, provider: 1 });
hostingOfferSchema.index({ isActive: 1 });

export default mongoose.models.HostingOffer ||
  mongoose.model<IHostingOffer>("HostingOffer", hostingOfferSchema);
