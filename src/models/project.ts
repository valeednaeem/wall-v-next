import mongoose, { Schema, Document } from "mongoose";

export interface IProject extends Document {
  name: string;
  slug: string;
  title?: string;
  description: string;
  client: mongoose.Types.ObjectId | { name: string; email: string; phone?: string };
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
  projectManager?: mongoose.Types.ObjectId;
  milestones: {
    name: string;
    description?: string;
    dueDate?: Date;
    amount?: number;
    status: "pending" | "in-progress" | "completed" | "generated" | "review" | "approved" | "changes-requested";
    completedAt?: Date;
    deliverables?: string[];
    outputType?: string;
    generatedAt?: Date;
    approvedAt?: Date;
    previewUrl?: string;
    version?: number;
    feedback?: {
      content: string;
      rating?: number;
      submittedAt: Date;
      submittedBy?: mongoose.Types.ObjectId;
    };
  }[];
  milestoneVersions?: {
    version: number;
    milestoneName: string;
    milestoneIndex: number;
    previewUrl: string;
    demoId: string;
    generatedAt: Date;
    requirements?: Record<string, unknown>;
    feedback?: {
      content: string;
      rating?: number;
      submittedAt: Date;
      submittedBy?: mongoose.Types.ObjectId;
    };
    status: "generated" | "approved" | "rejected";
    generatedBy: "ai" | "admin" | "system";
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
    objective?: string;
    industry?: string;
    targetAudience?: string;
    integrations?: string[];
  };
  quote?: {
    min: number;
    max: number;
    currency: string;
  };
  language?: string;
  // Checkout fields
  orderId?: mongoose.Types.ObjectId;
  paymentStatus?: "unpaid" | "partial" | "paid";
  // Project updates
  updates?: {
    title: string;
    description: string;
    author: mongoose.Types.ObjectId;
    createdAt: Date;
    milestoneIndex?: number;
    taskId?: mongoose.Types.ObjectId;
    files?: { name: string; url: string }[];
  }[];
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
    projectManager: { type: Schema.Types.ObjectId, ref: "User" },
    milestones: [
      {
        name: String,
        description: String,
        dueDate: Date,
        amount: { type: Number, min: 0 },
        status: { type: String, enum: ["pending", "in-progress", "completed", "generated", "review", "approved", "changes-requested"], default: "pending" },
        completedAt: Date,
        deliverables: [String],
        outputType: String,
        generatedAt: Date,
        approvedAt: Date,
        previewUrl: String,
        version: { type: Number, default: 1 },
        feedback: {
          content: String,
          rating: Number,
          submittedAt: Date,
          submittedBy: { type: Schema.Types.ObjectId, ref: "User" },
        },
      },
    ],
    milestoneVersions: [
      {
        version: Number,
        milestoneName: String,
        milestoneIndex: Number,
        previewUrl: String,
        demoId: String,
        generatedAt: Date,
        requirements: Schema.Types.Mixed,
        feedback: {
          content: String,
          rating: Number,
          submittedAt: Date,
          submittedBy: { type: Schema.Types.ObjectId, ref: "User" },
        },
        status: { type: String, enum: ["generated", "approved", "rejected"], default: "generated" },
        generatedBy: { type: String, enum: ["ai", "admin", "system"], default: "ai" },
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
      objective: String,
      industry: String,
      targetAudience: String,
      integrations: [String],
    },
    quote: {
      min: Number,
      max: Number,
      currency: { type: String, default: "USD" },
    },
    language: { type: String, default: "en" },
    // Checkout fields
    orderId: { type: Schema.Types.ObjectId, ref: "Order" },
    paymentStatus: { type: String, enum: ["unpaid", "partial", "paid"], default: "unpaid" },
    // Project updates
    updates: [
      {
        title: String,
        description: String,
        author: { type: Schema.Types.ObjectId, ref: "User" },
        createdAt: { type: Date, default: Date.now },
        milestoneIndex: Number,
        taskId: { type: Schema.Types.ObjectId, ref: "Task" },
        files: [{ name: String, url: String }],
      },
    ],
  },
  { timestamps: true }
);

ProjectSchema.index({ slug: 1 });
ProjectSchema.index({ client: 1 });
ProjectSchema.index({ status: 1 });
ProjectSchema.index({ demoId: 1 });
ProjectSchema.index({ projectManager: 1 });
ProjectSchema.index({ paymentStatus: 1 });
ProjectSchema.index({ "milestones.status": 1 });

export default mongoose.models.Project ||
  mongoose.model<IProject>("Project", ProjectSchema);
