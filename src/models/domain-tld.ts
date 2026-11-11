import mongoose, { Schema, Document } from "mongoose";

export interface IDomainTLD extends Document {
  tld: string;
  provider: "resellerspanel" | "websouls";
  registrationPrice: number;
  renewalPrice: number;
  transferPrice: number;
  currency: string;
  margin: number;
  finalPrice: number;
  finalRenewalPrice: number;
  description: string;
  features: string[];
  isActive: boolean;
  isPromo: boolean;
  promoPrice?: number;
  promoDuration?: number;
  category: "generic" | "cctld" | "new" | "special";
  sortOrder: number;
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const domainTLDSchema = new Schema<IDomainTLD>(
  {
    tld: { type: String, required: true, unique: true, lowercase: true, trim: true },
    provider: { type: String, enum: ["resellerspanel", "websouls"], required: true },
    registrationPrice: { type: Number, required: true, min: 0 },
    renewalPrice: { type: Number, required: true, min: 0 },
    transferPrice: { type: Number, default: 0, min: 0 },
    currency: { type: String, required: true, default: "USD" },
    margin: { type: Number, required: true, default: 15, min: 0, max: 100 },
    finalPrice: { type: Number, required: true },
    finalRenewalPrice: { type: Number, required: true },
    description: { type: String, default: "" },
    features: { type: [String], default: [] },
    isActive: { type: Boolean, default: true },
    isPromo: { type: Boolean, default: false },
    promoPrice: { type: Number },
    promoDuration: { type: Number },
    category: { type: String, enum: ["generic", "cctld", "new", "special"], default: "generic" },
    sortOrder: { type: Number, default: 0 },
    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

domainTLDSchema.index({ tld: 1 });
domainTLDSchema.index({ isActive: 1 });
domainTLDSchema.index({ category: 1 });

export default mongoose.models.DomainTLD ||
  mongoose.model<IDomainTLD>("DomainTLD", domainTLDSchema);
