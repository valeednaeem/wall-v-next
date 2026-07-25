import mongoose, { Schema, Document } from "mongoose";

export interface IProject extends Document {
  name: string;
  slug: string;
  title?: string;
  description: string;
  client: mongoose.Types.ObjectId | { name: string; email: string };
  status: "planning" | "in-progress" | "review" | "testing" | "completed" | "on-hold" | "cancelled" | "demo" | "pending-payment";
  priority: "low" | "medium" | "high" | "urgent";
  budget: number;
  spent: number;
  currency: string;
  startDate?: Date;
  endDate?: Date;
  deadline?: Date;
  progress: number;
  team: {
    user: mongoose.Types.ObjectId;
    role: string;
  }[];
  milestones: {
    name: string;
    description?: string;
    dueDate?: Date;
    status: "pending" | "in-progress" | "completed";
    completedAt?: Date;
  }[];
  tasks: mongoose.Types.ObjectId[];
  files: {
    name: string;
    url: string;
    size: number;
    uploadedBy: mongoose.Types.ObjectId;
    uploadedAt: Date;
  }[];
  tags: string[];
  notes?: string;
  // AI Demo fields
  demoId?: string;
  demoHTML?: string;
  requirements?: {
    projectType?: string;
    features?: string[];
    budget?: string;
    timeline?: string;
    designStyle?: string;
  };
  quote?: {
    min: number;
    max: number;
    currency: string;
  };
  language?: string;
  createdAt: Date;
  updatedAt: Date;
}

const ProjectSchema = new Schema<IProject>(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true },
    title: String,
    description: { type: String, required: true },
    client: { type: Schema.Types.Mixed, required: true },
    status: {
      type: String,
      enum: ["planning", "in-progress", "review", "testing", "completed", "on-hold", "cancelled", "demo", "pending-payment"],
      default: "planning",
    },
    priority: {
      type: String,
      enum: ["low", "medium", "high", "urgent"],
      default: "medium",
    },
    budget: { type: Number, default: 0, min: 0 },
    spent: { type: Number, default: 0, min: 0 },
    currency: { type: String, default: "USD" },
    startDate: Date,
    endDate: Date,
    deadline: Date,
    progress: { type: Number, default: 0, min: 0, max: 100 },
    team: [
      {
        user: { type: Schema.Types.ObjectId, ref: "User" },
        role: String,
      },
    ],
    milestones: [
      {
        name: String,
        description: String,
        dueDate: Date,
        status: { type: String, enum: ["pending", "in-progress", "completed"], default: "pending" },
        completedAt: Date,
      },
    ],
    tasks: [{ type: Schema.Types.ObjectId, ref: "Task" }],
    files: [
      {
        name: String,
        url: String,
        size: Number,
        uploadedBy: { type: Schema.Types.ObjectId, ref: "User" },
        uploadedAt: { type: Date, default: Date.now },
      },
    ],
    tags: [String],
    notes: String,
    // AI Demo fields
    demoId: { type: String, unique: true, sparse: true },
    demoHTML: String,
    requirements: {
      projectType: String,
      features: [String],
      budget: String,
      timeline: String,
      designStyle: String,
    },
    quote: {
      min: Number,
      max: Number,
      currency: { type: String, default: "USD" },
    },
    language: { type: String, default: "en" },
  },
  { timestamps: true }
);

ProjectSchema.index({ slug: 1 });
ProjectSchema.index({ client: 1 });
ProjectSchema.index({ status: 1 });
ProjectSchema.index({ demoId: 1 });

export default mongoose.models.Project ||
  mongoose.model<IProject>("Project", ProjectSchema);
