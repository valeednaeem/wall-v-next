import { NextRequest, NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongodb";
import Agent from "@/models/agent";
import User from "@/models/user";

const SEED_SECRET = process.env.SEED_SECRET || "wall-v-seed-2024";

const MASTER_AGENT_CONFIG = {
  name: "Wall-V Master Agent",
  slug: "master-client-agent",
  description: "AI-powered project consultant that guides clients through requirements gathering and project scoping.",
  type: "hybrid" as const,
  role: "sales" as const,
  status: "active" as const,
  personality: {
    tone: "professional" as const,
    language: "en",
    maxResponseLength: 500,
    responseStyle: "consultative",
  },
  systemPrompt: `You are the Master Client Agent for Wall-V, a leading digital agency. Your role is to guide clients through the project discovery and requirements gathering process.

## Your Process (Follow these steps in order):
1. **Greeting** - Welcome the client warmly, introduce yourself
2. **Project Type** - Ask what kind of project they need
3. **Objective** - Understand their business goal
4. **Features** - Discuss specific features needed
5. **Design & Brand** - Ask about design preferences
6. **Industry & Audience** - Understand their industry and users
7. **Integrations** - Ask about third-party tools needed
8. **Budget** - Discuss budget range
9. **Timeline** - Understand deadline expectations
10. **Summary & Quote** - Present summary and estimated quote
11. **Confirmation** - Get approval to create the project

## Rules:
- Be professional, warm, and consultative
- Ask ONE question at a time
- If the client provides info unprompted, acknowledge it
- After gathering enough info, summarize what you understand
- Generate an estimated quote based on Wall-V's pricing
- Keep responses concise and helpful`,
  instructions: [
    "Always greet the client warmly",
    "Ask one question at a time",
    "Track conversation progress",
    "Generate quotes based on project scope",
    "Create project requests when confirmed",
  ],
  aiModel: "gpt-4o",
  temperature: 0.7,
  maxTokens: 2048,
  memory: {
    type: "conversation" as const,
    maxItems: 50,
    ttl: 86400,
  },
  guardrails: {
    blockedTopics: ["competitor pricing", "internal salaries", "trade secrets"],
    maxConversationLength: 100,
    requireApproval: false,
    contentFilter: true,
    fallbackMessage: "I'm sorry, I can't help with that. Let me connect you with a human agent.",
  },
  channels: {
    website: true,
    whatsapp: false,
    email: false,
    api: true,
    dashboard: true,
    voice: false,
  },
  integrations: {
    crm: true,
    projects: true,
    billing: false,
    support: false,
  },
  isClientFacing: true,
  isMasterAgent: true,
  masterConfig: {
    canCreateProjects: true,
    canGenerateQuotes: true,
    canProcessPayments: false,
    canScheduleMeetings: true,
    requirementSteps: [
      "greeting", "project-type", "objective", "features",
      "design-brand", "industry-audience", "integrations",
      "budget", "timeline", "summary-quote", "confirmation",
    ],
    approvalRequired: true,
  },
  stats: {
    totalConversations: 0,
    totalMessages: 0,
    avgConversationLength: 0,
    satisfactionScore: 0,
    conversionRate: 0,
    avgResponseTime: 0,
    resolutionRate: 0,
  },
};

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const secret = searchParams.get("secret");

    if (secret !== SEED_SECRET) {
      return NextResponse.json({ error: "Invalid secret" }, { status: 403 });
    }

    await connectToDatabase();

    const existing = await Agent.findOne({ slug: MASTER_AGENT_CONFIG.slug });
    if (existing) {
      return NextResponse.json({
        message: "Master Agent already exists",
        agent: { id: existing._id, name: existing.name, slug: existing.slug, status: existing.status },
      });
    }

    const adminUser = await User.findOne({ role: "super-admin" }).select("_id");
    if (!adminUser) {
      return NextResponse.json({ error: "No super-admin user found" }, { status: 400 });
    }

    const agent = await Agent.create({
      ...MASTER_AGENT_CONFIG,
      createdBy: adminUser._id,
    });

    return NextResponse.json({
      message: "Master Agent created successfully!",
      agent: { id: agent._id, name: agent.name, slug: agent.slug, status: agent.status },
    });
  } catch (error) {
    console.error("Seed error:", error);
    return NextResponse.json({ error: "Seed failed" }, { status: 500 });
  }
}
