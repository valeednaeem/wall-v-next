import mongoose, { Schema, Document } from "mongoose";

export interface IHostingPlan extends Document {
  name: string;
  slug: string;
  provider: "resellerspanel" | "websouls";
  providerPlanId: string;
  price: number;
  renewalPrice: number;
  currency: string;
  billingCycle: "monthly" | "quarterly" | "annually" | "biennially" | "triennially";
  margin: number;
  finalPrice: number;
  finalRenewalPrice: number;
  description: string;
  shortDescription: string;
  features: string[];
  highlights: string[];
  diskSpace: string;
  bandwidth: string;
  websites: number;
  emailAccounts: string;
  databases: string;
  ssl: boolean;
  backup: boolean;
  migration: boolean;
  sshAccess: boolean;
  dedicatedIp: boolean;
  websiteBuilder: boolean;
  oneClickInstaller: boolean;
  controlPanel: string;
  isActive: boolean;
  isPopular: boolean;
  sortOrder: number;
  category: "shared" | "cloud" | "vps" | "dedicated" | "reseller" | "email";
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const hostingPlanSchema = new Schema<IHostingPlan>(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    provider: { type: String, enum: ["resellerspanel", "websouls"], required: true },
    providerPlanId: { type: String, required: true },
    price: { type: Number, required: true, min: 0 },
    renewalPrice: { type: Number, required: true, min: 0 },
    currency: { type: String, required: true, default: "USD" },
    billingCycle: { type: String, enum: ["monthly", "quarterly", "annually", "biennially", "triennially"], default: "monthly" },
    margin: { type: Number, required: true, default: 15, min: 0, max: 100 },
    finalPrice: { type: Number, required: true },
    finalRenewalPrice: { type: Number, required: true },
    description: { type: String, required: true },
    shortDescription: { type: String, default: "" },
    features: { type: [String], default: [] },
    highlights: { type: [String], default: [] },
    diskSpace: { type: String, required: true },
    bandwidth: { type: String, required: true },
    websites: { type: Number, required: true, default: 1 },
    emailAccounts: { type: String, required: true },
    databases: { type: String, required: true },
    ssl: { type: Boolean, default: true },
    backup: { type: Boolean, default: true },
    migration: { type: Boolean, default: true },
    sshAccess: { type: Boolean, default: false },
    dedicatedIp: { type: Boolean, default: false },
    websiteBuilder: { type: Boolean, default: false },
    oneClickInstaller: { type: Boolean, default: true },
    controlPanel: { type: String, default: "cPanel" },
    isActive: { type: Boolean, default: true },
    isPopular: { type: Boolean, default: false },
    sortOrder: { type: Number, default: 0 },
    category: { type: String, enum: ["shared", "cloud", "vps", "dedicated", "reseller", "email"], default: "shared" },
    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

hostingPlanSchema.index({ slug: 1 });
hostingPlanSchema.index({ isActive: 1 });
hostingPlanSchema.index({ category: 1 });
hostingPlanSchema.index({ provider: 1 });

export default mongoose.models.HostingPlan ||
  mongoose.model<IHostingPlan>("HostingPlan", hostingPlanSchema);
