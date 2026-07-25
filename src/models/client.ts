import mongoose, { Schema, Document } from "mongoose";

export interface IClient extends Document {
  user?: mongoose.Types.ObjectId;
  name: string;
  email: string;
  phone?: string;
  company?: string;
  address?: {
    street?: string;
    city?: string;
    state?: string;
    country?: string;
    zip?: string;
  };
  type: "individual" | "business" | "enterprise";
  status: "active" | "inactive" | "prospect" | "archived";
  source?: string;
  notes?: string;
  tags: string[];
  totalProjects: number;
  totalSpent: number;
  lastContact?: Date;
  assignedTo?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const ClientSchema = new Schema<IClient>(
  {
    user: { type: Schema.Types.ObjectId, ref: "User" },
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    phone: String,
    company: String,
    address: {
      street: String,
      city: String,
      state: String,
      country: String,
      zip: String,
    },
    type: { type: String, enum: ["individual", "business", "enterprise"], default: "individual" },
    status: { type: String, enum: ["active", "inactive", "prospect", "archived"], default: "prospect" },
    source: String,
    notes: String,
    tags: [String],
    totalProjects: { type: Number, default: 0 },
    totalSpent: { type: Number, default: 0 },
    lastContact: Date,
    assignedTo: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

ClientSchema.index({ email: 1 });
ClientSchema.index({ status: 1 });
ClientSchema.index({ assignedTo: 1 });

export default mongoose.models.Client ||
  mongoose.model<IClient>("Client", ClientSchema);
