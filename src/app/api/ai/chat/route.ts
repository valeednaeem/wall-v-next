import { NextResponse } from "next/server";
import { generateAIContent } from "@/services/ai";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import {
  initializeConversationState,
  processUserMessage,
  generateNextResponse,
  generateDiscoverySystemPrompt,
  type ConversationState,
} from "@/lib/project-discovery";
import { logError } from "@/lib/error-logger";

// ─── In-Memory Conversation State Cache ──────────────────────────────────────
// Maps conversationId → { state, lastAccess }
// TTL: 30 minutes. Max 1000 active conversations.
const conversationCache = new Map<string, { state: ConversationState; lastAccess: number }>();
const CACHE_TTL = 30 * 60 * 1000;
const MAX_CACHE_SIZE = 1000;

function getCachedState(conversationId: string): ConversationState | null {
  const entry = conversationCache.get(conversationId);
  if (!entry) return null;
  if (Date.now() - entry.lastAccess > CACHE_TTL) {
    conversationCache.delete(conversationId);
    return null;
  }
  entry.lastAccess = Date.now();
  return entry.state;
}

function setCachedState(conversationId: string, state: ConversationState): void {
  // Evict oldest if at capacity
  if (conversationCache.size >= MAX_CACHE_SIZE) {
    const oldest = [...conversationCache.entries()]
      .sort((a, b) => a[1].lastAccess - b[1].lastAccess)[0];
    if (oldest) conversationCache.delete(oldest[0]);
  }
  conversationCache.set(conversationId, { state, lastAccess: Date.now() });
}

// ─── Language Names ──────────────────────────────────────────────────────────

const LANGUAGE_NAMES: Record<string, string> = {
  en: "English", es: "Spanish", fr: "French", de: "German", ar: "Arabic",
  zh: "Chinese", ja: "Japanese", ko: "Korean", pt: "Portuguese", ru: "Russian",
  hi: "Hindi", tr: "Turkish", ur: "Urdu",
};

// ─── POST Handler ────────────────────────────────────────────────────────────

export async function POST(request: Request) {
  try {
    const ip = getClientIp(request);
    const { allowed, resetAt } = checkRateLimit(`ai-chat:${ip}`, 20, 60000);
    if (!allowed) {
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        { status: 429, headers: { "Retry-After": String(Math.ceil((resetAt - Date.now()) / 1000)) } }
      );
    }

    const body = await request.json();
    const {
      messages,
      language = "en",
      agentType = "general",
      conversationId,
      useDiscovery = true,
    } = body;

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: "Messages array is required" }, { status: 400 });
    }

    const langName = LANGUAGE_NAMES[language] || "English";

    // ── Discovery Mode ─────────────────────────────────────────────────────
    if (useDiscovery && conversationId) {
      return await handleDiscoveryMode(conversationId, messages, language, langName);
    }

    // ── Fallback: Static Prompt Mode ───────────────────────────────────────
    return await handleStaticMode(messages, agentType, langName);
  } catch (error) {
    await logError({
      level: "error",
      message: "AI chat error",
      source: "api/ai/chat",
      stack: error instanceof Error ? error.stack : undefined,
    });
    return NextResponse.json({ error: "AI service error" }, { status: 500 });
  }
}

// ─── Discovery Mode ──────────────────────────────────────────────────────────

async function handleDiscoveryMode(
  conversationId: string,
  messages: { role: string; content: string }[],
  language: string,
  langName: string
) {
  // Get or initialize conversation state
  let state = getCachedState(conversationId);
  if (!state) {
    state = initializeConversationState(language);
  }

  // Get the latest user message
  const lastUserMsg = messages[messages.length - 1];
  if (!lastUserMsg || lastUserMsg.role !== "user") {
    return NextResponse.json({ error: "Last message must be from user" }, { status: 400 });
  }

  // Process through discovery engine
  state = processUserMessage(state, lastUserMsg.content);

  // Check if brief is complete → generate project
  if (state.stage === "create-inquiry") {
    setCachedState(conversationId, state);
    return await handleBriefComplete(state, conversationId, langName);
  }

  // Generate next response from discovery engine
  const discoveryResponse = generateNextResponse(state);

  // Use AI to polish the discovery response (make it conversational)
  const systemPrompt = generateDiscoverySystemPrompt(state);
  const aiMessages = [
    { role: "system" as const, content: systemPrompt },
    { role: "user" as const, content: lastUserMsg.content },
  ];

  let aiContent: string;
  try {
    aiContent = await generateAIContent(aiMessages);
  } catch {
    // If AI fails, use the raw discovery response
    aiContent = discoveryResponse.message;
  }

  // Save state
  setCachedState(conversationId, state);

  return NextResponse.json({
    success: true,
    data: {
      content: aiContent,
      discovery: {
        stage: state.stage,
        action: discoveryResponse.action,
        suggestions: discoveryResponse.suggestions,
        briefComplete: state.stage === "generate-brief",
        missingInfo: state.brief.missingInformation,
      },
    },
  });
}

// ─── Brief Complete → Production Workflow ─────────────────────────────────────

async function handleBriefComplete(
  state: ConversationState,
  conversationId: string,
  langName: string
) {
  const brief = state.brief;
  const contactEmail = (brief as unknown as Record<string, unknown>)._contactEmail as string | undefined;
  const contactPhone = (brief as unknown as Record<string, unknown>)._contactPhone as string | undefined;

  // Build production requirements from the discovery brief
  const requirements = {
    projectType: brief.projectType || "website",
    projectName: brief.title || `${brief.projectType || "project"} project`,
    clientName: brief.title?.replace("'s Project", "") || "Web Visitor",
    clientEmail: contactEmail || "",
    clientPhone: contactPhone || "",
    features: brief.features,
    budget: brief.estimatedBudget || undefined,
    timeline: brief.desiredTimeline || undefined,
    designStyle: brief.designPreferences || undefined,
    language: state.language,
    objective: brief.objective,
    industry: brief.businessContext.industry || undefined,
    targetAudience: brief.targetAudience || undefined,
    integrations: brief.integrations,
    authRequired: brief.projectType === "web-application" || brief.projectType === "saas",
    dbRequired: brief.projectType === "web-application" || brief.projectType === "saas" || brief.projectType === "ecommerce",
    adminDashboard: brief.projectType === "web-application" || brief.projectType === "saas" || brief.projectType === "ecommerce",
    clientDashboard: brief.projectType === "saas",
    apiRequired: brief.projectType === "web-application" || brief.projectType === "saas",
    seoRequired: brief.seoRequired || brief.projectType === "website" || brief.projectType === "ecommerce",
    mobileRequired: brief.mobileAppRequired,
  };

  // Dynamically import to avoid circular dependencies
  const { runProductionWorkflow } = await import("@/lib/production-workflow");

  const result = await runProductionWorkflow(requirements, {
    skipPreview: false,
    skipDemo: false,
  });

  const lang = langName;
  const summary = `Great! I've created your project. Here's the summary:

**Project:** ${result.projectName}
**Type:** ${result.projectType}
**Status:** ${result.status}

**Cost Analysis:**
- Development: $${result.costAnalysis.developmentCost.subtotal.toLocaleString()}
- Third-party: $${result.costAnalysis.thirdPartyCosts.subtotal.toLocaleString()}
- One-time: $${result.costAnalysis.oneTimeCosts.subtotal.toLocaleString()}

**Deliverables:** ${result.deliverables.map((d) => d.type).join(", ")}

**First Milestone:** ${result.firstMilestone.name}
- Description: ${result.firstMilestone.description}

**Budget:** ${result.budgetComparison.status === "within-budget" ? "Within your budget" : result.budgetComparison.status === "significantly-above" ? "Above your budget" : "Under your budget"}${result.budgetComparison.difference !== null ? ` (${result.budgetComparison.difference > 0 ? "+" : ""}$${result.budgetComparison.difference.toLocaleString()})` : ""}

${result.checkoutUrl ? `**Checkout:** ${result.checkoutUrl}` : ""}
${result.previewUrl ? `**Preview:** ${result.previewUrl}` : ""}

Our team will review this and get back to you shortly. Would you like to proceed with the first milestone?`;

  // Reset state so we don't re-trigger
  state.stage = "completed";
  setCachedState(conversationId, state);

  return NextResponse.json({
    success: true,
    data: {
      content: summary,
      discovery: {
        stage: "completed",
        action: "project_created",
        projectId: result.projectId,
        projectName: result.projectName,
        checkoutUrl: result.checkoutUrl,
        previewUrl: result.previewUrl,
        costAnalysis: result.costAnalysis,
        budgetComparison: result.budgetComparison,
        deliverables: result.deliverables,
        firstMilestone: result.firstMilestone,
      },
    },
  });
}

// ─── Static Mode (Legacy Fallback) ───────────────────────────────────────────

async function handleStaticMode(
  messages: { role: string; content: string }[],
  agentType: string,
  langName: string
) {
  const systemPrompts: Record<string, string> = {
    general: `You are Wall-V AI, a helpful assistant for Wall-V, an AI-powered digital agency. You help with general inquiries about our services (web development, AI automation, ERP/CRM, hosting, mobile apps, digital marketing). Be friendly, professional, and concise. If the user shares their name, use it naturally 1-2 times during the conversation. IMPORTANT: Always respond in ${langName}.`,
    sales: `You are Wall-V AI Sales Agent. You help potential clients understand our services and pricing. Our plans start at $499 (Starter), $1,499 (Professional), and $2,999+ (Enterprise). We also offer hosting from $1.99/mo to $29.99/mo. Be persuasive but honest. If the user shares their name, use it naturally 1-2 times during the conversation to build rapport. IMPORTANT: Always respond in ${langName}.`,
    support: `You are Wall-V AI Support Agent. You help existing clients with technical issues, hosting problems, and account questions. Be patient and thorough. IMPORTANT: Always respond in ${langName}.`,
    content: `You are Wall-V AI Content Writer. You help create blog posts, website copy, and marketing content. Be creative and engaging. IMPORTANT: Always respond in ${langName}.`,
    technical: `You are Wall-V AI Technical Assistant. You help with technical questions about our stack: Next.js, React, Node.js, MongoDB, Tailwind CSS, AI/ML, cloud hosting. Be precise and technical. IMPORTANT: Always respond in ${langName}.`,
  };

  const systemMessage = {
    role: "system" as const,
    content: systemPrompts[agentType] || systemPrompts.general,
  };

  const apiMessages = [systemMessage, ...messages.map((m) => ({
    role: m.role as "user" | "assistant",
    content: m.content,
  }))];

  const response = await generateAIContent(apiMessages);

  return NextResponse.json({
    success: true,
    data: { content: response },
  });
}
