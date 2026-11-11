import mongoose, { Schema, Document } from "mongoose";

export interface ICookieDefinition extends Document {
  name: string;
  slug: string;
  description: string;
  category: mongoose.Types.ObjectId;
  provider: string;
  purpose: string;
  duration: string;
  type: "first-party" | "third-party";
  isRequired: boolean;
  isActive: boolean;
  domain?: string;
  path?: string;
  sameSite?: "strict" | "lax" | "none";
  secure?: boolean;
  scriptPattern?: string;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

const CookieDefinitionSchema = new Schema<ICookieDefinition>(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true },
    description: { type: String, required: true },
    category: { type: Schema.Types.ObjectId, ref: "CookieCategory", required: true },
    provider: { type: String, required: true },
    purpose: { type: String, required: true },
    duration: { type: String, required: true },
    type: { type: String, enum: ["first-party", "third-party"], default: "first-party" },
    isRequired: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
    domain: String,
    path: { type: String, default: "/" },
    sameSite: { type: String, enum: ["strict", "lax", "none"], default: "lax" },
    secure: { type: Boolean, default: true },
    scriptPattern: String,
    sortOrder: { type: Number, default: 0 },
  },
  { timestamps: true }
);

CookieDefinitionSchema.index({ slug: 1 });
CookieDefinitionSchema.index({ category: 1 });
CookieDefinitionSchema.index({ isActive: 1 });

export default mongoose.models.CookieDefinition ||
  mongoose.model<ICookieDefinition>("CookieDefinition", CookieDefinitionSchema);
