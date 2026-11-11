import mongoose, { Schema, Document } from "mongoose";

export interface IContentExecution extends Document {
  campaign: mongoose.Types.ObjectId;
  plan: mongoose.Types.ObjectId;
  planVersion: number;
  contentItem?: mongoose.Types.ObjectId;
  topic?: mongoose.Types.ObjectId;
  blogPost?: mongoose.Types.ObjectId;
  type: "plan_execution" | "article_generation" | "quality_check" | "blog_creation" | "social_generation" | "social_publish" | "image_generation";
  status: "queued" | "running" | "completed" | "failed" | "skipped";
  stage: string;
  agent: string;
  startedAt: Date;
  completedAt?: Date;
  duration?: number;
  input?: Record<string, unknown>;
  output?: Record<string, unknown>;
  error?: string;
  retries: number;
  maxRetries: number;
  metadata: {
    model?: string;
    tokens?: { prompt: number; completion: number; total: number };
    qualityScore?: number;
    publicationUrl?: string;
    platformPostId?: string;
    platform?: string;
  };
  auditTrail: {
    stage: string;
    status: string;
    timestamp: Date;
    message?: string;
    duration?: number;
  }[];
  createdAt: Date;
  updatedAt: Date;
}

const ContentExecutionSchema = new Schema<IContentExecution>(
  {
    campaign: { type: Schema.Types.ObjectId, ref: "ContentCampaign", required: true, index: true },
    plan: { type: Schema.Types.ObjectId, ref: "ContentPlan", required: true, index: true },
    planVersion: { type: Number, default: 1 },
    contentItem: { type: Schema.Types.ObjectId, ref: "ContentItem" },
    topic: { type: Schema.Types.ObjectId, ref: "ContentTopic" },
    blogPost: { type: Schema.Types.ObjectId, ref: "BlogPost" },
    type: {
      type: String,
      enum: ["plan_execution", "article_generation", "quality_check", "blog_creation", "social_generation", "social_publish", "image_generation"],
      required: true,
    },
    status: {
      type: String,
      enum: ["queued", "running", "completed", "failed", "skipped"],
      default: "queued",
    },
    stage: { type: String, default: "queued" },
    agent: { type: String, default: "content-orchestrator" },
    startedAt: { type: Date, default: Date.now },
    completedAt: Date,
    duration: Number,
    input: { type: Schema.Types.Mixed },
    output: { type: Schema.Types.Mixed },
    error: String,
    retries: { type: Number, default: 0 },
    maxRetries: { type: Number, default: 3 },
    metadata: {
      model: String,
      tokens: {
        prompt: { type: Number, default: 0 },
        completion: { type: Number, default: 0 },
        total: { type: Number, default: 0 },
      },
      qualityScore: Number,
      publicationUrl: String,
      platformPostId: String,
      platform: String,
    },
    auditTrail: [
      {
        stage: { type: String, required: true },
        status: { type: String, required: true },
        timestamp: { type: Date, default: Date.now },
        message: String,
        duration: Number,
      },
    ],
  },
  { timestamps: true }
);

ContentExecutionSchema.index({ campaign: 1, status: 1 });
ContentExecutionSchema.index({ plan: 1, status: 1 });
ContentExecutionSchema.index({ contentItem: 1 });
ContentExecutionSchema.index({ status: 1, startedAt: -1 });
ContentExecutionSchema.index({ type: 1, status: 1 });

export default mongoose.models.ContentExecution ||
  mongoose.model<IContentExecution>("ContentExecution", ContentExecutionSchema);
