import mongoose, { Schema, Document } from "mongoose";

export interface IContact extends Document {
  name: string;
  email: string;
  phone?: string;
  subject: string;
  message: string;
  type: "general" | "support" | "sales" | "partnership";
  status: "new" | "read" | "replied" | "archived";
  source?: string;
  notes?: string;
  emailStatus: {
    admin: "pending" | "sent" | "failed" | "not_applicable";
    related: "pending" | "sent" | "failed" | "not_applicable";
    user: "pending" | "sent" | "failed" | "not_applicable";
    lastError?: string;
    lastAttemptAt?: Date;
  };
  createdAt: Date;
  updatedAt: Date;
}

const ContactSchema = new Schema<IContact>(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    phone: String,
    subject: { type: String, required: true, trim: true },
    message: { type: String, required: true },
    type: {
      type: String,
      enum: ["general", "support", "sales", "partnership"],
      default: "general",
    },
    status: {
      type: String,
      enum: ["new", "read", "replied", "archived"],
      default: "new",
    },
    source: String,
    notes: String,
    emailStatus: {
      admin: { type: String, enum: ["pending", "sent", "failed", "not_applicable"], default: "pending" },
      related: { type: String, enum: ["pending", "sent", "failed", "not_applicable"], default: "not_applicable" },
      user: { type: String, enum: ["pending", "sent", "failed", "not_applicable"], default: "pending" },
      lastError: { type: String, default: "" },
      lastAttemptAt: { type: Date },
    },
  },
  { timestamps: true }
);

ContactSchema.index({ status: 1 });
ContactSchema.index({ email: 1 });

export default mongoose.models.Contact ||
  mongoose.model<IContact>("Contact", ContactSchema);
