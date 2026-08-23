import mongoose, { Schema, Document } from "mongoose";

export interface IProjectRequest extends Document {
  agent: mongoose.Types.ObjectId;
  conversation?: mongoose.Types.ObjectId;
  client: {
    name: string;
    email: string;
    phone?: string;
    company?: string;
  };
  requirements: {
    projectType: string;
    objective: string;
    features: string[];
    designStyle?: string;
    industry?: string;
    targetAudience?: string;
    integrations?: string[];
    budget?: {
      min: number;
      max: number;
      currency: string;
    };
    timeline?: string;
    pages?: string[];
    techStack?: string[];
    specialRequirements?: string;
  };
  extractedData: {
    rawConversation: string;
    keyDecisions: string[];
    missingInformation: string[];
    confidenceScore: number;
  };
  quote?: {
    min: number;
    max: number;
    currency: string;
    breakdown?: {
      category: string;
      description: string;
      min: number;
      max: number;
    }[];
  };
  status: "collecting" | "requirements-gathered" | "quoted" | "approved" | "project-created" | "rejected" | "expired";
  approvalStatus?: "pending" | "approved" | "rejected";
  approvedBy?: mongoose.Types.ObjectId;
  approvedAt?: Date;
  project?: mongoose.Types.ObjectId;
  milestonePlan?: {
    name: string;
    description: string;
    deliverables: string[];
    estimatedDays: number;
    amount: number;
  }[];
  createdAt: Date;
  updatedAt: Date;
}

const ProjectRequestSchema = new Schema<IProjectRequest>(
  {
    agent: { type: Schema.Types.ObjectId, ref: "Agent", required: true },
    conversation: { type: Schema.Types.ObjectId, ref: "AgentConversation" },
    client: {
      name: { type: String, required: true },
      email: { type: String, required: true },
      phone: String,
      company: String,
    },
    requirements: {
      projectType: { type: String, required: true },
      objective: { type: String, required: true },
      features: [String],
      designStyle: String,
      industry: String,
      targetAudience: String,
      integrations: [String],
      budget: {
        min: Number,
        max: Number,
        currency: { type: String, default: "USD" },
      },
      timeline: String,
      pages: [String],
      techStack: [String],
      specialRequirements: String,
    },
    extractedData: {
      rawConversation: String,
      keyDecisions: [String],
      missingInformation: [String],
      confidenceScore: { type: Number, default: 0, min: 0, max: 100 },
    },
    quote: {
      min: Number,
      max: Number,
      currency: { type: String, default: "USD" },
      breakdown: [
        {
          category: String,
          description: String,
          min: Number,
          max: Number,
        },
      ],
    },
    status: {
      type: String,
      enum: ["collecting", "requirements-gathered", "quoted", "approved", "project-created", "rejected", "expired"],
      default: "collecting",
    },
    approvalStatus: { type: String, enum: ["pending", "approved", "rejected"] },
    approvedBy: { type: Schema.Types.ObjectId, ref: "User" },
    approvedAt: Date,
    project: { type: Schema.Types.ObjectId, ref: "Project" },
    milestonePlan: [
      {
        name: String,
        description: String,
        deliverables: [String],
        estimatedDays: Number,
        amount: Number,
      },
    ],
  },
  { timestamps: true }
);

ProjectRequestSchema.index({ agent: 1 });
ProjectRequestSchema.index({ status: 1 });
ProjectRequestSchema.index({ "client.email": 1 });
ProjectRequestSchema.index({ createdAt: -1 });

export default mongoose.models.ProjectRequest ||
  mongoose.model<IProjectRequest>("ProjectRequest", ProjectRequestSchema);
