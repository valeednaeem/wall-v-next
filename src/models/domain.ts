import mongoose, { Schema, Document } from "mongoose";

export interface IDomain extends Document {
  user: mongoose.Types.ObjectId;
  domain: string;
  status: "active" | "pending" | "expired" | "suspended" | "transferring";
  registrar: string;
  registrarAccountId?: string;
  registrationDate: Date;
  expiryDate: Date;
  autoRenew: boolean;
  nameservers: string[];
  registrantInfo: {
    name: string;
    email: string;
    organization?: string;
    address: string;
    city: string;
    country: string;
    phone: string;
  };
  dnsRecords: {
    type: string;
    name: string;
    value: string;
    ttl: number;
  }[];
  whoisPrivacy: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const DomainSchema = new Schema<IDomain>(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    domain: { type: String, required: true, unique: true, lowercase: true },
    status: {
      type: String,
      enum: ["active", "pending", "expired", "suspended", "transferring"],
      default: "pending",
    },
    registrar: { type: String, required: true },
    registrarAccountId: String,
    registrationDate: { type: Date, required: true },
    expiryDate: { type: Date, required: true },
    autoRenew: { type: Boolean, default: true },
    nameservers: [String],
    registrantInfo: {
      name: String,
      email: String,
      organization: String,
      address: String,
      city: String,
      country: String,
      phone: String,
    },
    dnsRecords: [
      {
        type: String,
        name: String,
        value: String,
        ttl: Number,
      },
    ],
    whoisPrivacy: { type: Boolean, default: false },
  },
  { timestamps: true }
);

DomainSchema.index({ user: 1 });
DomainSchema.index({ domain: 1 });
DomainSchema.index({ status: 1 });

export default mongoose.models.Domain ||
  mongoose.model<IDomain>("Domain", DomainSchema);
