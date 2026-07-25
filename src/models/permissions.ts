import mongoose, { Schema, Document } from "mongoose";

export interface IPermission extends Document {
  name: string;
  slug: string;
  description?: string;
  module: string;
  createdAt: Date;
}

const PermissionSchema = new Schema<IPermission>(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, uppercase: true },
    description: String,
    module: { type: String, required: true },
  },
  { timestamps: true }
);

export default mongoose.models.Permission ||
  mongoose.model<IPermission>("Permission", PermissionSchema);
