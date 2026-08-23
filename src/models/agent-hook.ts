import mongoose, { Schema, Document } from "mongoose";

export interface IAgentHook extends Document {
  name: string;
  slug: string;
  description: string;
  type: "website-chat" | "form-handler" | "api-endpoint" | "webhook" | "email-trigger" | "event-listener";
  status: "active" | "inactive" | "testing";
  agent: mongoose.Types.ObjectId;
  config: {
    // Website chat widget config
    widgetPosition?: "bottom-right" | "bottom-left" | "top-right" | "top-left";
    widgetColor?: string;
    widgetTitle?: string;
    welcomeMessage?: string;
    offlineMessage?: string;
    // Form handler config
    formSelector?: string;
    formAction?: "create-lead" | "create-inquiry" | "notify-agent" | "create-client";
    // API endpoint config
    apiPath?: string;
    apiMethods?: string[];
    // Webhook config
    webhookUrl?: string;
    webhookSecret?: string;
    // Email trigger config
    emailTrigger?: string;
    emailPattern?: string;
    // Event listener config
    eventType?: string;
    eventFilter?: Record<string, unknown>;
  };
  conditions: {
    field: string;
    operator: "equals" | "contains" | "not-equals" | "greater-than" | "less-than" | "regex";
    value: string;
  }[];
  actions: {
    type: "route-to-agent" | "create-record" | "send-notification" | "update-record" | "call-webhook" | "run-tool";
    config: Record<string, unknown>;
  }[];
  isGlobal: boolean;
  priority: number;
  usage: {
    totalTriggers: number;
    lastTriggered?: Date;
    successRate: number;
  };
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const AgentHookSchema = new Schema<IAgentHook>(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true },
    description: { type: String, required: true },
    type: {
      type: String,
      enum: ["website-chat", "form-handler", "api-endpoint", "webhook", "email-trigger", "event-listener"],
      required: true,
    },
    status: { type: String, enum: ["active", "inactive", "testing"], default: "inactive" },
    agent: { type: Schema.Types.ObjectId, ref: "Agent", required: true },
    config: {
      widgetPosition: { type: String, enum: ["bottom-right", "bottom-left", "top-right", "top-left"] },
      widgetColor: String,
      widgetTitle: String,
      welcomeMessage: String,
      offlineMessage: String,
      formSelector: String,
      formAction: { type: String, enum: ["create-lead", "create-inquiry", "notify-agent", "create-client"] },
      apiPath: String,
      apiMethods: [String],
      webhookUrl: String,
      webhookSecret: String,
      emailTrigger: String,
      emailPattern: String,
      eventType: String,
      eventFilter: Schema.Types.Mixed,
    },
    conditions: [
      {
        field: { type: String, required: true },
        operator: { type: String, enum: ["equals", "contains", "not-equals", "greater-than", "less-than", "regex"], required: true },
        value: { type: String, required: true },
      },
    ],
    actions: [
      {
        type: { type: String, enum: ["route-to-agent", "create-record", "send-notification", "update-record", "call-webhook", "run-tool"], required: true },
        config: { type: Schema.Types.Mixed, default: {} },
      },
    ],
    isGlobal: { type: Boolean, default: false },
    priority: { type: Number, default: 0 },
    usage: {
      totalTriggers: { type: Number, default: 0 },
      lastTriggered: Date,
      successRate: { type: Number, default: 100 },
    },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

AgentHookSchema.index({ slug: 1 });
AgentHookSchema.index({ agent: 1 });
AgentHookSchema.index({ type: 1 });
AgentHookSchema.index({ status: 1 });
AgentHookSchema.index({ isGlobal: 1 });

export default mongoose.models.AgentHook ||
  mongoose.model<IAgentHook>("AgentHook", AgentHookSchema);
