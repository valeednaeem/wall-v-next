import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import Agent from "@/models/agent";
import AgentSkill from "@/models/agent-skill";
import AgentConversation from "@/models/agent-conversation";
import { getAuthUser } from "@/lib/auth";
import { checkRateLimit, getClientIp, logSecurityEvent } from "@/lib/security";

/**
 * POST /api/ai/assist
 * Universal AI Assistance Layer.
 * Any page can request AI assistance based on context.
 *
 * Body: {
 *   context: "blog-editor" | "project-detail" | "product-admin" | "crm" | "service-request" | ...,
 *   action: "generate" | "analyze" | "suggest" | "review" | "summarize",
 *   resourceType?: "blog-post" | "project" | "product" | "inquiry" | "invoice" | ...,
 *   resourceId?: string,
 *   input?: string,
 *   constraints?: { maxLength?, tone?, format? }
 * }
 *
 * Returns: { agent, response, suggestions? }
 */
export async function POST(request: Request) {
  const ip = getClientIp(request);
  const user = await getAuthUser();

  try {
    // Rate limit: 30 per minute
    const rl = checkRateLimit("ai-assist:" + (user?.userId || ip), 30, 60 * 1000);
    if (!rl.allowed) {
      return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
    }

    await connectToDatabase();
    const body = await request.json();
    const { context, action, resourceType, resourceId, input, constraints } = body;

    if (!context || !action) {
      return NextResponse.json({ error: "context and action are required" }, { status: 400 });
    }

    // 1. Find appropriate agent based on context
    const agent = await findAgentForContext(context, resourceType);
    if (!agent) {
      return NextResponse.json({ error: "No suitable agent found for this context" }, { status: 404 });
    }

    // 2. Find relevant skills
    const skills = await findSkillsForContext(context, action, resourceType);

    // 3. Build system prompt with context
    const systemPrompt = buildContextPrompt(agent, context, action, resourceType, resourceId, skills);

    // 4. Call AI with context
    const { generateAIContent } = await import("@/services/ai");

    const messages = [
      { role: "system" as const, content: systemPrompt },
      { role: "user" as const, content: input || getDefaultPrompt(action, context, resourceType) },
    ];

    const response = await generateAIContent(messages, {
      temperature: 0.7,
      maxTokens: constraints?.maxLength || 2000,
    });

    // 5. Log execution
    await AgentConversation.create({
      agent: agent._id,
      channel: "dashboard",
      status: "completed",
      visitor: { id: user?.userId || "anonymous" },
      context: { page: context },
      messages: [
        { role: "user", content: input || getDefaultPrompt(action, context, resourceType) },
        { role: "assistant", content: response },
      ],
      outcome: "resolved",
    });

    // 6. Parse suggestions from response if action is "suggest"
    let suggestions: string[] | undefined;
    if (action === "suggest") {
      suggestions = response.split("\n").filter((l: string) => l.trim().startsWith("-") || l.trim().startsWith("*")).map((s: string) => s.replace(/^[-*]\s*/, "").trim());
    }

    return NextResponse.json({
      success: true,
      data: {
        agent: { id: agent._id, name: agent.name, role: agent.role },
        response,
        suggestions,
        skills: skills.map((s: { name: string }) => s.name),
      },
    });
  } catch (error) {
    console.error("AI Assist error:", error);
    await logSecurityEvent({
      type: "suspicious_activity",
      severity: "low",
      userId: user?.userId,
      ip,
      path: "/api/ai/assist",
      method: "POST",
      details: { error: String(error) },
    });
    return NextResponse.json({ error: "AI assistance failed" }, { status: 500 });
  }
}

// ─── Context → Agent Mapping ──────────────────────────────────────────────

const CONTEXT_AGENT_ROLE_MAP: Record<string, string[]> = {
  "blog-editor": ["marketing", "custom"],
  "project-detail": ["technical", "operations"],
  "product-admin": ["marketing", "custom"],
  "crm": ["sales", "support"],
  "service-request": ["sales", "support"],
  "invoice": ["operations", "finance"],
  "seo": ["marketing"],
  "design": ["custom"],
  "development": ["technical"],
  "support": ["support"],
  "finance": ["operations"],
};

async function findAgentForContext(context: string, _resourceType?: string) {
  const roles = CONTEXT_AGENT_ROLE_MAP[context] || ["custom"];

  // Try to find an active agent matching the context role
  let agent = await Agent.findOne({
    status: "active",
    role: { $in: roles },
    $or: [
      { contexts: context },
      { contexts: { $exists: true, $ne: [] } },
    ],
  }).sort({ "stats.totalConversations": -1 }).lean();

  // Fallback: any active agent
  if (!agent) {
    agent = await Agent.findOne({ status: "active" }).sort({ "stats.totalConversations": -1 }).lean();
  }

  return agent;
}

async function findSkillsForContext(context: string, _action: string, _resourceType?: string) {
  const keywordMap: Record<string, string[]> = {
    "blog-editor": ["content", "seo", "marketing"],
    "project-detail": ["project-management", "development"],
    "product-admin": ["content", "marketing"],
    "crm": ["crm", "sales"],
    "seo": ["seo", "content"],
    "design": ["design"],
    "development": ["development"],
    "support": ["support", "conversation"],
    "finance": ["finance"],
  };

  const categories = keywordMap[context] || [];

  return AgentSkill.find({
    status: "active",
    category: { $in: categories },
  }).limit(3).lean();
}

function buildContextPrompt(
  agent: { name: string; systemPrompt?: string; instructions?: string },
  context: string,
  action: string,
  resourceType?: string,
  resourceId?: string,
  skills?: { name: string; instructions?: string; capabilities?: string[] }[]
): string {
  const parts: string[] = [];

  parts.push(`You are ${agent.name}, an AI assistant for the Wall-V platform.`);
  parts.push(`Current context: ${context}`);
  parts.push(`Action requested: ${action}`);
  if (resourceType) parts.push(`Resource type: ${resourceType}`);
  if (resourceId) parts.push(`Resource ID: ${resourceId}`);

  if (agent.systemPrompt) {
    parts.push(`\nYour personality:\n${agent.systemPrompt}`);
  }

  if (skills && skills.length > 0) {
    parts.push(`\nRelevant skills available:`);
    for (const skill of skills) {
      parts.push(`- ${skill.name}: ${skill.capabilities?.join(", ") || skill.instructions || ""}`);
    }
  }

  parts.push(`\nProvide helpful, actionable responses. Be concise but thorough.`);
  parts.push(`If generating content, use proper formatting (markdown).`);
  parts.push(`If analyzing, provide specific insights with evidence.`);
  parts.push(`If suggesting, provide numbered actionable recommendations.`);

  return parts.join("\n");
}

function getDefaultPrompt(action: string, context: string, resourceType?: string): string {
  const prompts: Record<string, string> = {
    generate: `Generate high-quality content for the ${context}${resourceType ? ` ${resourceType}` : ""}. Focus on accuracy, engagement, and SEO best practices.`,
    analyze: `Analyze the current ${context}${resourceType ? ` ${resourceType}` : ""} and provide actionable insights for improvement.`,
    suggest: `Suggest 5-10 improvements for the ${context}${resourceType ? ` ${resourceType}` : ""}. Prioritize by impact.`,
    review: `Review the ${context}${resourceType ? ` ${resourceType}` : ""} for quality, accuracy, and completeness. Highlight issues and improvements.`,
    summarize: `Summarize the key information from this ${context}${resourceType ? ` ${resourceType}` : ""}. Focus on what matters most.`,
  };
  return prompts[action] || `Help with ${context} ${action}`;
}
