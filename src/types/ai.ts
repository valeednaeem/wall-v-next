export interface AIChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

export interface AIChatRequest {
  messages: AIChatMessage[];
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

export interface AIChatResponse {
  content: string;
  model: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export interface AIContentRequest {
  type: "blog" | "description" | "seo" | "social" | "email" | "proposal";
  prompt: string;
  context?: string;
  tone?: string;
  length?: "short" | "medium" | "long";
}

export interface AIEstimateRequest {
  projectType: string;
  description: string;
  features: string[];
  timeline?: string;
}

export interface AIEstimateResponse {
  budget: {
    min: number;
    max: number;
    currency: string;
  };
  timeline: {
    min: number;
    max: number;
    unit: string;
  };
  breakdown: {
    category: string;
    hours: number;
    cost: number;
  }[];
  suggestions: string[];
  risks: string[];
}
