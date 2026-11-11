import mongoose, { Schema, Document } from "mongoose";

export interface ILead extends Document {
  name: string;
  email: string;
  phone?: string;
  company?: string;
  source: string;
  status: "new" | "contacted" | "qualified" | "proposal" | "negotiation" | "won" | "lost";
  score: number;
  budget?: number;
  requirements?: string;
  serviceInterest: string[];
  assignedTo?: mongoose.Types.ObjectId;
  notes?: string;
  tags: string[];
  lastContact?: Date;
  nextFollowUp?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const LeadSchema = new Schema<ILead>(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    phone: String,
    company: String,
    source: { type: String, required: true },
    status: {
      type: String,
      enum: ["new", "contacted", "qualified", "proposal", "negotiation", "won", "lost"],
      default: "new",
    },
    score: { type: Number, default: 0, min: 0, max: 100 },
    budget: Number,
    requirements: String,
    serviceInterest: [String],
    assignedTo: { type: Schema.Types.ObjectId, ref: "User" },
    notes: String,
    tags: [String],
    lastContact: Date,
    nextFollowUp: Date,
  },
  { timestamps: true }
);

LeadSchema.index({ email: 1 });
LeadSchema.index({ status: 1 });
LeadSchema.index({ assignedTo: 1 });

export default mongoose.models.Lead ||
  mongoose.model<ILead>("Lead", LeadSchema);
