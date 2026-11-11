import mongoose, { Schema, Document } from "mongoose";

export interface IRole extends Document {
  name: string;
  slug: string;
  description?: string;
  permissions: string[];
  isSystem: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const RoleSchema = new Schema<IRole>(
  {
    name: { type: String, required: true, unique: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true },
    description: String,
    permissions: [{ type: String }],
    isSystem: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export default mongoose.models.Role || mongoose.model<IRole>("Role", RoleSchema);
