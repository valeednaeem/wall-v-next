import mongoose, { Schema, Document } from "mongoose";

export interface IHosting extends Document {
  user: mongoose.Types.ObjectId;
  plan: mongoose.Types.ObjectId;
  domain: string;
  username: string;
  status: "active" | "suspended" | "terminated" | "pending";
  provider: string;
  providerAccountId?: string;
  ipAddress?: string;
  nameservers?: string[];
  diskUsage?: number;
  bandwidthUsage?: number;
  diskLimit: number;
  bandwidthLimit: number;
  emailAccounts: number;
  databases: number;
  subdomains: number;
  sslEnabled: boolean;
  renewalDate: Date;
  createdAt: Date;
  updatedAt: Date;
}

const HostingSchema = new Schema<IHosting>(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    plan: { type: Schema.Types.ObjectId, ref: "Product", required: true },
    domain: { type: String, required: true },
    username: { type: String, required: true },
    status: {
      type: String,
      enum: ["active", "suspended", "terminated", "pending"],
      default: "pending",
    },
    provider: { type: String, default: "rsp" },
    providerAccountId: String,
    ipAddress: String,
    nameservers: [String],
    diskUsage: { type: Number, default: 0 },
    bandwidthUsage: { type: Number, default: 0 },
    diskLimit: { type: Number, required: true },
    bandwidthLimit: { type: Number, required: true },
    emailAccounts: { type: Number, default: 0 },
    databases: { type: Number, default: 0 },
    subdomains: { type: Number, default: 0 },
    sslEnabled: { type: Boolean, default: false },
    renewalDate: { type: Date, required: true },
  },
  { timestamps: true }
);

HostingSchema.index({ user: 1 });
HostingSchema.index({ domain: 1 });
HostingSchema.index({ status: 1 });

export default mongoose.models.Hosting ||
  mongoose.model<IHosting>("Hosting", HostingSchema);
