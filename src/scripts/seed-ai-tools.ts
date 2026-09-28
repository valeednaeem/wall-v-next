import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";
import dns from "dns";
import AIToolCategory from "../models/ai-tool-category";
import AIToolTag from "../models/ai-tool-tag";
import AIToolProvider from "../models/ai-tool-provider";
import AIToolPlan from "../models/ai-tool-plan";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/wallvnext";

function slugify(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

const categories = [
  "Writing & Content", "Image Generation", "Image Editing", "Video", "Audio & Voice",
  "Speech-to-Text", "Text-to-Speech", "SEO", "Marketing", "Productivity",
  "Documents & PDF", "Developer Tools", "Coding", "Data & Analytics", "Business",
  "Education", "Research", "Automation", "AI Agents", "Social Media",
  "E-commerce", "Design", "Utilities",
];

const categoryDescriptions: Record<string, string> = {
  "Writing & Content": "AI tools for drafting, rewriting, and producing written content.",
  "Image Generation": "Text-to-image and generative visual tools.",
  "Image Editing": "Automated photo and graphic editing tools.",
  Video: "AI-powered video creation and editing tools.",
  "Audio & Voice": "Audio generation, cloning, and music tools.",
  "Speech-to-Text": "Transcription and voice-to-text tools.",
  "Text-to-Speech": "Natural voice synthesis and narration tools.",
  SEO: "Search engine optimization analysis and improvement tools.",
  Marketing: "Campaign, copy, and growth tools for marketers.",
  Productivity: "Tools that speed up everyday knowledge work.",
  "Documents & PDF": "Summarize, extract, and transform documents.",
  "Developer Tools": "Utilities built for software developers.",
  Coding: "Code generation, review, and refactoring tools.",
  "Data & Analytics": "Data transformation and insight tools.",
  Business: "Operations, strategy, and business analysis tools.",
  Education: "Learning, tutoring, and study assistance tools.",
  Research: "Literature review, synthesis, and discovery tools.",
  Automation: "Workflow and task automation tools.",
  "AI Agents": "Autonomous and semi-autonomous agent tools.",
  "Social Media": "Content scheduling and social publishing tools.",
  "E-commerce": "Store, product, and commerce assistance tools.",
  Design: "UI, graphic, and product design assistance.",
  Utilities: "General-purpose helpers and converters.",
};

const tags = [
  "AI", "GPT", "Automation", "SEO", "Content", "Image",
  "Voice", "Developer", "PDF", "Marketing", "Productivity", "Analytics",
];

const providers = [
  {
    name: "OpenAI",
    type: "openai" as const,
    envKeyName: "OPENAI_API_KEY",
    isDefault: true,
    models: [
      { name: "gpt-4o", label: "GPT-4o", enabled: true, inputCostPer1k: 0.0025, outputCostPer1k: 0.01 },
      { name: "gpt-4o-mini", label: "GPT-4o Mini", enabled: true, inputCostPer1k: 0.00015, outputCostPer1k: 0.0006 },
    ],
    rateLimit: { requestsPerMinute: 60 },
    notes: "Primary chat and content provider.",
  },
  {
    name: "Anthropic",
    type: "anthropic" as const,
    envKeyName: "AI_API_KEY",
    isDefault: false,
    models: [
      { name: "claude-sonnet-4", label: "Claude Sonnet 4", enabled: true, inputCostPer1k: 0.003, outputCostPer1k: 0.015 },
    ],
    rateLimit: { requestsPerMinute: 50 },
    notes: "Long-form technical content provider. Key is read from AI_API_KEY.",
  },
  {
    name: "Google",
    type: "google" as const,
    envKeyName: "GOOGLE_AI_API_KEY",
    isDefault: false,
    models: [
      { name: "gemini-2.5-pro", label: "Gemini 2.5 Pro", enabled: false },
    ],
    rateLimit: { requestsPerMinute: 30 },
    notes: "Reserved for future integration.",
  },
  {
    name: "ElevenLabs",
    type: "elevenlabs" as const,
    envKeyName: "ELEVENLABS_API_KEY",
    isDefault: false,
    models: [
      { name: "eleven-multilingual-v2", label: "Multilingual v2", enabled: false },
    ],
    rateLimit: { requestsPerMinute: 20 },
    notes: "Reserved for text-to-speech tools.",
  },
];

const plans = [
  { name: "Free", monthlyPrice: 0, yearlyPrice: 0, includedCredits: 50, includedExecutions: 100, sortOrder: 1,
    description: "Get started with core AI tools at no cost.",
    features: ["Access to free tools", "50 credits / month", "Community support"] },
  { name: "Starter", monthlyPrice: 19, yearlyPrice: 190, includedCredits: 1000, includedExecutions: 500, sortOrder: 2,
    description: "For individuals exploring AI-powered workflows.",
    features: ["All free + freemium tools", "1,000 credits / month", "Email support"] },
  { name: "Professional", monthlyPrice: 49, yearlyPrice: 490, includedCredits: 5000, includedExecutions: 3000, sortOrder: 3,
    description: "For professionals using AI tools daily.",
    features: ["All tools", "5,000 credits / month", "Priority support", "Higher usage limits"] },
  { name: "Business", monthlyPrice: 99, yearlyPrice: 990, includedCredits: 15000, includedExecutions: 10000, sortOrder: 4,
    description: "For teams that need volume and control.",
    features: ["All tools", "15,000 credits / month", "Dedicated support", "Team usage analytics"] },
];

async function seed() {
  try {
    await mongoose.connect(MONGODB_URI as string);
    console.log("Connected to MongoDB");

    for (let i = 0; i < categories.length; i++) {
      const name = categories[i];
      await AIToolCategory.updateOne(
        { slug: slugify(name) },
        {
          $set: {
            name,
            slug: slugify(name),
            description: categoryDescriptions[name] || "",
            sortOrder: i + 1,
            isActive: true,
          },
          $setOnInsert: { seo: {} },
        },
        { upsert: true }
      );
    }
    console.log(`Seeded ${categories.length} categories`);

    for (const name of tags) {
      await AIToolTag.updateOne(
        { slug: slugify(name) },
        { $set: { name, slug: slugify(name) } },
        { upsert: true }
      );
    }
    console.log(`Seeded ${tags.length} tags`);

    for (const p of providers) {
      await AIToolProvider.updateOne(
        { slug: slugify(p.name) },
        {
          $set: {
            name: p.name,
            slug: slugify(p.name),
            type: p.type,
            status: "active",
            isDefault: p.isDefault,
            envKeyName: p.envKeyName,
            models: p.models,
            rateLimit: p.rateLimit,
            notes: p.notes,
          },
        },
        { upsert: true }
      );
    }
    console.log(`Seeded ${providers.length} providers`);

    for (const plan of plans) {
      await AIToolPlan.updateOne(
        { slug: slugify(plan.name) },
        {
          $set: {
            ...plan,
            slug: slugify(plan.name),
            status: "active",
          },
        },
        { upsert: true }
      );
    }
    console.log(`Seeded ${plans.length} plans`);

    console.log("Seed completed successfully");
    process.exit(0);
  } catch (error) {
    console.error("Seed failed:", error);
    process.exit(1);
  }
}

seed();
