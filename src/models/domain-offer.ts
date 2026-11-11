import mongoose, { Schema, Document } from "mongoose";

export interface IDomainOffer extends Document {
  tld: string;
  provider: "resellerspanel" | "websouls";
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

const domainOfferSchema = new Schema<IDomainOffer>(
  {
    tld: { type: String, required: true, lowercase: true, trim: true },
    provider: { type: String, enum: ["resellerspanel", "websouls"], required: true },
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

domainOfferSchema.index({ tld: 1, provider: 1 });
domainOfferSchema.index({ isActive: 1 });

export default mongoose.models.DomainOffer ||
  mongoose.model<IDomainOffer>("DomainOffer", domainOfferSchema);
