import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";
import dns from "dns";
import AIToolCategory from "../models/ai-tool-category";
import AIToolTag from "../models/ai-tool-tag";
import AIToolProvider from "../models/ai-tool-provider";
import AIToolPlan from "../models/ai-tool-plan";
import AITool from "../models/ai-tool";

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

interface SeedToolRecord {
  name: string;
  category: string;
  icon: string;
  accessModel: "free" | "freemium" | "subscription";
  shortDescription: string;
  description: string;
  features: string[];
  provider?: string;
  model?: string;
  tags?: string[];
  displayOrder: number;
}

/**
 * Starter tool records for the AI Tools dashboard.
 *
 * All records are seeded as `status: "draft"` — never auto-published.
 * Publishing requires an explicit, permission-gated admin action
 * (bulk publish requires `ai-tools:publish`), so nothing becomes publicly
 * visible by default. No API keys or secrets are ever written here; the
 * provider reference only names which env-based provider would execute.
 */
const toolRecords: SeedToolRecord[] = [
  {
    name: "Content Writer",
    category: "Writing & Content",
    icon: "PenTool",
    accessModel: "freemium",
    shortDescription: "Draft articles, blogs, and marketing copy with AI assistance.",
    description: "Generate long-form drafts, outlines, and rewrites grounded in your topic and tone of voice. Edit and publish when ready.",
    features: ["Long-form drafting", "Tone control", "Rewrite & summarize"],
    provider: "OpenAI",
    model: "gpt-4o-mini",
    tags: ["AI", "GPT", "Content"],
    displayOrder: 10,
  },
  {
    name: "Blog Outline Generator",
    category: "Writing & Content",
    icon: "ListTree",
    accessModel: "free",
    shortDescription: "Turn a topic keyword into a structured blog outline.",
    description: "Produce heading hierarchies, section summaries, and suggested internal-link opportunities for any topic.",
    features: ["Heading hierarchy", "Section summaries", "Keyword clustering"],
    provider: "OpenAI",
    model: "gpt-4o-mini",
    tags: ["AI", "Content", "SEO"],
    displayOrder: 20,
  },
  {
    name: "Image Prompt Studio",
    category: "Image Generation",
    icon: "ImageIcon",
    accessModel: "freemium",
    shortDescription: "Craft detailed prompts for AI image generation.",
    description: "Build production-ready image prompts with style, lighting, composition, and negative-prompt guidance.",
    features: ["Prompt templates", "Style presets", "Negative prompts"],
    provider: "OpenAI",
    model: "gpt-4o-mini",
    tags: ["AI", "Image", "Content"],
    displayOrder: 30,
  },
  {
    name: "Code Assistant",
    category: "Coding",
    icon: "Code",
    accessModel: "freemium",
    shortDescription: "Explain, refactor, and generate code snippets.",
    description: "Get language-aware code completions, refactors, bug explanations, and test scaffolding from your description.",
    features: ["Snippet generation", "Refactor suggestions", "Test scaffolding"],
    provider: "Anthropic",
    model: "claude-sonnet-4",
    tags: ["AI", "Developer", "GPT"],
    displayOrder: 40,
  },
  {
    name: "SEO Meta Optimizer",
    category: "SEO",
    icon: "Search",
    accessModel: "free",
    shortDescription: "Generate title tags and meta descriptions that fit SERP limits.",
    description: "Produce character-counted meta titles and descriptions with keyword placement guidance for any page.",
    features: ["Title & meta generation", "Character limits", "Keyword placement"],
    provider: "OpenAI",
    model: "gpt-4o-mini",
    tags: ["AI", "SEO", "Marketing"],
    displayOrder: 50,
  },
  {
    name: "Document Summarizer",
    category: "Documents & PDF",
    icon: "FileText",
    accessModel: "freemium",
    shortDescription: "Summarize long documents into key points and actions.",
    description: "Condense reports, contracts, and research papers into executive summaries, bullet points, and action items.",
    features: ["Executive summaries", "Bullet extraction", "Action items"],
    provider: "OpenAI",
    model: "gpt-4o-mini",
    tags: ["AI", "PDF", "Productivity"],
    displayOrder: 60,
  },
  {
    name: "Email Campaign Writer",
    category: "Marketing",
    icon: "Mail",
    accessModel: "freemium",
    shortDescription: "Write subject lines and email bodies for campaigns.",
    description: "Generate drip sequences, launch announcements, and newsletter copy with CTA variants for A/B testing.",
    features: ["Subject line variants", "Drip sequences", "CTA copy"],
    provider: "OpenAI",
    model: "gpt-4o-mini",
    tags: ["AI", "Marketing", "Content"],
    displayOrder: 70,
  },
  {
    name: "Social Post Generator",
    category: "Social Media",
    icon: "Share2",
    accessModel: "free",
    shortDescription: "Repurpose content into platform-tuned social posts.",
    description: "Turn a blog post or announcement into tailored posts for LinkedIn, X, and Instagram with hashtag suggestions.",
    features: ["Platform tuning", "Hashtag suggestions", "Thread drafting"],
    provider: "OpenAI",
    model: "gpt-4o-mini",
    tags: ["AI", "Marketing", "Content"],
    displayOrder: 80,
  },
  {
    name: "Voice Script Writer",
    category: "Audio & Voice",
    icon: "Mic",
    accessModel: "free",
    shortDescription: "Write natural scripts for voice agents and narration.",
    description: "Produce conversational scripts, IVR flows, and narration copy tuned for text-to-speech delivery.",
    features: ["Conversational scripts", "IVR flows", "Read-aloud tuning"],
    provider: "OpenAI",
    model: "gpt-4o-mini",
    tags: ["AI", "Voice", "Content"],
    displayOrder: 90,
  },
  {
    name: "Workflow Automation Planner",
    category: "Automation",
    icon: "Workflow",
    accessModel: "subscription",
    shortDescription: "Design step-by-step automation blueprints for repetitive tasks.",
    description: "Map trigger, action, and error-handling steps for common business automations, ready to implement.",
    features: ["Trigger mapping", "Error handling steps", "Tool recommendations"],
    provider: "Anthropic",
    model: "claude-sonnet-4",
    tags: ["AI", "Automation", "Productivity"],
    displayOrder: 100,
  },
  {
    name: "Business Name Brainstorm",
    category: "Business",
    icon: "Lightbulb",
    accessModel: "free",
    shortDescription: "Generate business and product name ideas with domain hints.",
    description: "Explore name directions by industry and tone, with rationale and rough domain-style variants.",
    features: ["Name directions", "Tone matching", "Domain-style variants"],
    provider: "OpenAI",
    model: "gpt-4o-mini",
    tags: ["AI", "Productivity"],
    displayOrder: 110,
  },
  {
    name: "Research Synthesizer",
    category: "Research",
    icon: "FlaskConical",
    accessModel: "freemium",
    shortDescription: "Synthesize notes and sources into structured findings.",
    description: "Combine raw notes and citations into themed findings, open questions, and a references section.",
    features: ["Theme clustering", "Open questions", "Reference lists"],
    provider: "Anthropic",
    model: "claude-sonnet-4",
    tags: ["AI", "Productivity", "Analytics"],
    displayOrder: 120,
  },
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

    // ── Tool records (idempotent) ───────────────────────────────────────────
    // $setOnInsert guarantees existing records — including admin edits — are
    // never overwritten, and a re-run can never create duplicates (slug is
    // unique). Draft status keeps them off the public site until an admin
    // explicitly publishes (ai-tools:publish).
    let createdTools = 0;
    let existingTools = 0;
    for (const tool of toolRecords) {
      const slug = slugify(tool.name);
      const category = await AIToolCategory.findOne({ slug: slugify(tool.category) }).lean();
      if (!category) {
        console.warn(`  Skipping "${tool.name}" — category "${tool.category}" not found`);
        continue;
      }

      const providerDoc = tool.provider
        ? await AIToolProvider.findOne({ slug: slugify(tool.provider) }).lean()
        : null;
      if (tool.provider && !providerDoc) {
        console.warn(`  "${tool.name}" — provider "${tool.provider}" not found, seeding without provider link`);
      }

      let tagIds: unknown[] = [];
      if (tool.tags?.length) {
        tagIds = (await AIToolTag.find({ slug: { $in: tool.tags.map(slugify) } }).lean()).map((t) => t._id);
      }

      const insertDoc: Record<string, unknown> = {
        name: tool.name,
        slug,
        shortDescription: tool.shortDescription,
        description: tool.description,
        icon: tool.icon,
        category: category._id,
        tags: tagIds,
        accessModel: tool.accessModel,
        status: "draft",
        features: tool.features,
        displayOrder: tool.displayOrder,
        aiConfig: providerDoc
          ? { provider: providerDoc._id, model: tool.model || "", routing: "provider" }
          : { routing: "global-default" },
      };

      const res = await AITool.updateOne({ slug }, { $setOnInsert: insertDoc }, { upsert: true });
      if (res.upsertedCount) createdTools++;
      else existingTools++;
    }
    console.log(`Seeded ${createdTools} tool records (${existingTools} already existed — left untouched)`);

    console.log("Seed completed successfully");
    process.exit(0);
  } catch (error) {
    console.error("Seed failed:", error);
    process.exit(1);
  }
}

seed();
