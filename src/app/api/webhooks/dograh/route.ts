import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import Conversation from "@/models/conversation";
import Lead from "@/models/lead";
import Inquiry from "@/models/inquiry";
import Client from "@/models/client";
import Project from "@/models/project";
import Preview, { createPreviewToken } from "@/models/preview";
import ServicePrice from "@/models/service-price";
import { generateDemoHTML } from "@/lib/demo-generator";
import { sendEmail, projectCreatedEmail } from "@/services/email";
import { corsHeaders, handleOPTIONS } from "@/lib/cors";
import { logError } from "@/lib/error-logger";

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "") + `-${Date.now()}`;
}

function extractCallerInfoFromTranscript(
  transcript: string,
  messages?: { role: string; content: string }[]
): {
  name?: string;
  email?: string;
  phone?: string;
  company?: string;
  budget?: string;
  timeline?: string;
  projectType?: string;
} {
  let name: string | undefined;
  let email: string | undefined;
  let phone: string | undefined;
  let company: string | undefined;
  let budget: string | undefined;
  let timeline: string | undefined;
  let projectType: string | undefined;

  // Extract email
  const emailMatch = transcript.match(/[\w.+-]+@[\w-]+\.[\w.-]+/);
  if (emailMatch) email = emailMatch[0];

  // Extract phone (US format)
  const phoneMatch = transcript.match(/(?:\+?1[\s.-]?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}/);
  if (phoneMatch) phone = phoneMatch[0].trim();

  // Extract company name
  const companyPatterns = [
    /(?:company|business|work(?:ing)?\s+(?:at|for|with))\s+(?:called\s+|named\s+|the\s+)?([A-Z][\w\s&,.']{1,40})/i,
    /(?:i(?:'m| am)\s+(?:from|at|with|with the company))\s+([A-Z][\w\s&,.']{1,40})/i,
    /(?:my company|our company|my business|our business)\s+(?:is|'s)?\s*(?:called|named)?\s*([A-Z][\w\s&,.']{1,40})/i,
  ];
  for (const pattern of companyPatterns) {
    const match = transcript.match(pattern);
    if (match && match[1]) {
      const candidate = match[1].trim();
      if (candidate.length > 1 && candidate.length < 60) {
        company = candidate;
        break;
      }
    }
  }

  // Extract budget
  const budgetPatterns = [
    /(?:budget|spend(?:ing)?|looking\s+(?:at|to\s+spend|to\s+invest))[:\s]*(?:of\s+|around\s+|about\s+|roughly\s+|approximately\s+)?\$?\s*([\d,]+(?:\.\d{2})?)\s*(k|K)?/i,
    /(?:under|less\s+than|up\s+to)\s+\$?\s*([\d,]+(?:\.\d{2})?)\s*(k|K)?/i,
    /(\$?\s*[\d,]+(?:\.\d{2})?\s*(?:k|K)?\s*(?:to|-)\s*\$?\s*[\d,]+(?:\.\d{2})?\s*(?:k|K)?)/i,
    /(?:around|about|roughly|approximately)\s+\$?\s*([\d,]+(?:\.\d{2})?)\s*(k|K)?/i,
  ];
  for (const pattern of budgetPatterns) {
    const match = transcript.match(pattern);
    if (match) {
      budget = match[0].trim();
      break;
    }
  }

  // Extract timeline
  const timelinePatterns = [
    /(?:timeline|deadline|when|by when|time(?:frame)?|ready|done|complete|launch)[:\s]*(?:is\s+|looking\s+(?:at|for)\s+|need\s+(?:it\s+)?(?:by|in|within)\s+)?((?:ASAP|asap|immediately|urgently|within\s+\d+\s*(?:day|week|month)s?|\d+\s*(?:day|week|month)s?|(?:next|this)\s+(?:week|month|quarter)|\d+\s*-\s*\d+\s*(?:day|week|month)s?|(?:flexible|no\s+(?:rush|hurry|deadline))))/i,
    /(?:i(?:'m| am)\s+(?:looking|hoping|need(?:ing)?)\s+(?:to\s+)?(?:get\s+(?:it\s+)?(?:done|completed|launched|started|finished))?\s*(?:by|in|within)\s+)((?:ASAP|asap|immediately|urgently|within\s+\d+\s*(?:day|week|month)s?|\d+\s*(?:day|week|month)s?|(?:next|this)\s+(?:week|month|quarter)|\d+\s*-\s*\d+\s*(?:day|week|month)s?))/i,
  ];
  for (const pattern of timelinePatterns) {
    const match = transcript.match(pattern);
    if (match) {
      timeline = (match[1] || match[0]).trim();
      break;
    }
  }

  // Extract project type
  const projectTypePatterns = [
    /(?:looking\s+(?:for|to\s+(?:get|build|create|have)))\s+(?:a\s+|an\s+)?((?:website|web\s*(?:app|application|site|development)|mobile\s*app|chatbot|ai\s*(?:chatbot|voice\s*agent|automation)|crm|erp|(?:e-?commerce|online)\s*store|seo|(?:digital\s*)?marketing|landing\s*page|portfolio|blog)\b)/i,
    /(?:i\s+(?:need|want|would\s+like))\s+(?:a\s+|an\s+)?((?:website|web\s*(?:app|application|site|development)|mobile\s*app|chatbot|ai\s*(?:chatbot|voice\s*agent|automation)|crm|erp|(?:e-?commerce|online)\s*store|seo|(?:digital\s*)?marketing|landing\s*page|portfolio|blog)\b)/i,
  ];
  for (const pattern of projectTypePatterns) {
    const match = transcript.match(pattern);
    if (match && match[1]) {
      projectType = match[1].trim();
      break;
    }
  }

  // Also try to extract name from messages (more reliable than full transcript)
  const sourceTexts = messages
    ?.filter((m) => m.role === "user")
    .map((m) => m.content) || [];

  // Common patterns the voice agent uses to ask for name
  const namePatterns = [
    /(?:my name is|i'm|i am|this is|it's|it is|call me|name's?)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,2})/i,
    /^([A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,2})$/m, // Just a name as a standalone response
  ];

  for (const source of sourceTexts) {
    for (const pattern of namePatterns) {
      const match = source.match(pattern);
      if (match && match[1]) {
        const candidate = match[1].trim();
        const falsePositives = ["yes", "no", "sure", "okay", "hello", "hi", "hey", "thanks", "good", "great", "fine", "right", "well", "yeah", "yep", "nah", "um", "uh"];
        if (!falsePositives.includes(candidate.toLowerCase()) && candidate.length > 1 && candidate.length < 50) {
          name = candidate;
          break;
        }
      }
    }
    if (name) break;
  }

  // Also try full transcript for name
  if (!name) {
    for (const pattern of namePatterns) {
      const match = transcript.match(pattern);
      if (match && match[1]) {
        const candidate = match[1].trim();
        const falsePositives = ["yes", "no", "sure", "okay", "hello", "hi", "hey", "thanks", "good", "great", "fine", "right", "well", "yeah", "yep"];
        if (!falsePositives.includes(candidate.toLowerCase()) && candidate.length > 1 && candidate.length < 50) {
          name = candidate;
          break;
        }
      }
    }
  }

  return { name, email, phone, company, budget, timeline, projectType };
}

interface ServiceMatch {
  serviceKey: string;
  name: string;
  category: string;
  basePrice: number;
  tiers?: { name: string; price: number; features: string[] }[];
  matchConfidence: number;
}

async function matchServicesFromTranscript(
  transcript: string,
  summary: string
): Promise<ServiceMatch[]> {
  const text = `${transcript} ${summary}`.toLowerCase();
  await connectToDatabase();
  const services = await ServicePrice.find({ active: true, agentVisible: true }).lean();

  const keywords: Record<string, string[]> = {
    website: ["website", "web development", "web app", "landing page", "business site", "ecommerce site", "online store"],
    "web-application": ["web application", "web app", "saas", "dashboard", "portal", "saas platform"],
    "mobile-app": ["mobile app", "ios", "android", "react native", "flutter", "phone app"],
    ecommerce: ["ecommerce", "e-commerce", "online store", "shop", "product catalog", "checkout"],
    crm: ["crm", "customer relationship", "lead management", "pipeline", "contact management"],
    erp: ["erp", "enterprise resource", "inventory", "finance management", "hr system"],
    chatbot: ["chatbot", "ai chatbot", "chat bot", "conversational ai", "customer support bot"],
    "voice-agent": ["voice agent", "phone agent", "ai caller", "call center", "automated calls", "ai receptionist"],
    seo: ["seo", "search engine optimization", "google ranking", "organic traffic"],
    marketing: ["marketing", "google ads", "meta ads", "social media marketing", "email marketing", "ppc"],
    design: ["ui/ux", "design", "wireframe", "prototype", "figma", "brand identity", "logo"],
    ai: ["artificial intelligence", "machine learning", "ai integration", "predictive", "automation", "ai solution"],
    hosting: ["hosting", "server", "domain", "ssl", "cloud hosting", "web hosting"],
    "ai-chatbot": ["chatbot", "ai chatbot", "tidio", "intercom", "live chat"],
    "ai-voice-agent": ["voice agent", "ai receptionist", "phone bot", "ai caller", "automated calling"],
  };

  const matches: ServiceMatch[] = [];

  for (const service of services) {
    let confidence = 0;
    const serviceKeywords = keywords[service.serviceKey] || [];
    const serviceName = service.name.toLowerCase();

    for (const kw of serviceKeywords) {
      if (text.includes(kw)) confidence += 30;
    }
    if (text.includes(serviceName)) confidence += 40;
    if (text.includes(service.category)) confidence += 10;

    if (confidence > 0) {
      const basePrice = service.type === "tiered" && service.tiers?.length
        ? service.tiers[0].price
        : service.basePrice;
      matches.push({
        serviceKey: service.serviceKey,
        name: service.name,
        category: service.category,
        basePrice,
        tiers: service.tiers,
        matchConfidence: Math.min(confidence, 100),
      });
    }
  }

  matches.sort((a, b) => b.matchConfidence - a.matchConfidence);
  return matches.slice(0, 3);
}

function estimateBudgetFromText(text: string): { min: number; max: number } | null {
  const budgetPatterns = [
    /(\d[\d,]*(?:\.\d{2})?)\s*(?:k|K)/,
    /\$\s*(\d[\d,]*(?:\.\d{2})?)/,
    /budget[:\s]*(?:of\s*)?\$?\s*(\d[\d,]*)/i,
    /(?:around|about|roughly|approximately)\s*\$?\s*(\d[\d,]*)/i,
  ];

  for (const pattern of budgetPatterns) {
    const match = text.match(pattern);
    if (match) {
      let num = parseFloat(match[1].replace(/,/g, ""));
      if (text.toLowerCase().includes("k")) num *= 1000;
      if (num >= 500 && num <= 500000) {
        return { min: Math.round(num * 0.7), max: Math.round(num * 1.3) };
      }
    }
  }
  return null;
}

function buildDefaultMilestones(
  serviceCategory: string,
  serviceName: string
): { name: string; description: string; status: "pending" }[] {
  const templates: Record<string, { name: string; description: string }[]> = {
    development: [
      { name: "Discovery & Planning", description: "Requirements gathering, sitemap, wireframes" },
      { name: "Design", description: "UI/UX design, brand integration, responsive layouts" },
      { name: "Development", description: "Frontend and backend implementation" },
      { name: "Content & SEO", description: "Content creation, SEO optimization, meta tags" },
      { name: "Testing & Launch", description: "QA testing, bug fixes, deployment" },
    ],
    "ai-automation": [
      { name: "Discovery & Design", description: "AI use case analysis, model selection, architecture" },
      { name: "Data & Training", description: "Data preparation, model training, fine-tuning" },
      { name: "Integration", description: "API development, UI integration, testing" },
      { name: "Optimization", description: "Performance tuning, accuracy improvement" },
      { name: "Deployment", description: "Production deployment, monitoring setup" },
    ],
    marketing: [
      { name: "Audit & Strategy", description: "Market analysis, competitor research, strategy" },
      { name: "Campaign Setup", description: "Ad creation, targeting, A/B test planning" },
      { name: "Launch & Optimize", description: "Campaign launch, daily monitoring, bid adjustments" },
      { name: "Reporting", description: "Performance reports, insights, recommendations" },
    ],
    design: [
      { name: "Research & Brief", description: "Brand research, user personas, design brief" },
      { name: "Wireframes", description: "Low-fidelity wireframes, user flow mapping" },
      { name: "Visual Design", description: "High-fidelity mockups, design system creation" },
      { name: "Prototyping", description: "Interactive prototypes, usability testing" },
      { name: "Handoff", description: "Design files, asset export, developer specs" },
    ],
    default: [
      { name: "Discovery & Planning", description: "Requirements gathering and project planning" },
      { name: "Design", description: "UI/UX design and prototyping" },
      { name: "Development", description: "Core implementation" },
      { name: "Testing", description: "Quality assurance and bug fixes" },
      { name: "Launch", description: "Deployment and go-live" },
    ],
  };

  const template = templates[serviceCategory] || templates.default;
  return template.map((t) => ({ ...t, status: "pending" as const }));
}

export async function OPTIONS() {
  return handleOPTIONS();
}

// ─── Defensive payload extraction ────────────────────────────────────────────
// Dograh (and provider upgrades) may nest fields or use alternate names.
// Extract from: top-level, data.*, payload.*, call.* — with common aliases.

interface NormalizedVoicePayload {
  agentId: string;
  workflowRunId: string;
  sessionId: string;
  status: string;
  duration: number;
  transcript: string;
  summary: string;
  messages: { role: "user" | "assistant"; content: string; timestamp?: string }[];
}

function pick(obj: Record<string, unknown> | undefined, keys: string[]): unknown {
  if (!obj) return undefined;
  for (const k of keys) {
    const v = obj[k];
    if (v !== undefined && v !== null && v !== "") return v;
  }
  return undefined;
}

function normalizeMessages(rawMessages: unknown): NormalizedVoicePayload["messages"] {
  // Accepts: [{role,content,timestamp}], [{speaker,text}], [[role,content]], {user:"..",assistant:".."}
  if (!rawMessages) return [];
  if (Array.isArray(rawMessages)) {
    const out: NormalizedVoicePayload["messages"] = [];
    for (const m of rawMessages) {
      if (Array.isArray(m) && m.length >= 2) {
        const role = String(m[0]).toLowerCase().includes("user") || String(m[0]).toLowerCase().includes("caller") ? "user" : "assistant";
        out.push({ role, content: String(m[1]) });
        continue;
      }
      if (m && typeof m === "object") {
        const mo = m as Record<string, unknown>;
        const content = String(pick(mo, ["content", "text", "message", "transcript"]) ?? "").trim();
        if (!content) continue;
        const rawRole = String(pick(mo, ["role", "speaker", "from", "sender"]) ?? "assistant").toLowerCase();
        const isUser = rawRole.includes("user") || rawRole.includes("caller") || rawRole.includes("human") || rawRole.includes("customer");
        out.push({
          role: isUser ? "user" : "assistant",
          content,
          timestamp: typeof mo.timestamp === "string" ? mo.timestamp : undefined,
        });
      }
    }
    return out;
  }
  if (typeof rawMessages === "object") {
    const mo = rawMessages as Record<string, unknown>;
    const out: NormalizedVoicePayload["messages"] = [];
    const user = pick(mo, ["user", "caller", "human"]);
    const assistant = pick(mo, ["assistant", "agent", "ai"]);
    if (typeof user === "string" && user.trim()) out.push({ role: "user", content: user.trim() });
    if (typeof assistant === "string" && assistant.trim()) out.push({ role: "assistant", content: assistant.trim() });
    return out;
  }
  return [];
}

function transcriptToMessages(transcript: string): NormalizedVoicePayload["messages"] {
  // Parse "USER:"/"AGENT:"/"Caller:"/"AI:" prefixed lines into structured messages
  const out: NormalizedVoicePayload["messages"] = [];
  if (!transcript || !transcript.trim()) return out;

  const linePattern = /^\s*(user|caller|visitor|customer|human|agent|assistant|ai|bot|system)\s*[:\-]\s*/gim;
  const matches: { role: "user" | "assistant"; start: number; end: number }[] = [];
  let m: RegExpExecArray | null;
  while ((m = linePattern.exec(transcript)) !== null) {
    const label = m[1].toLowerCase();
    const isUser = ["user", "caller", "visitor", "customer", "human"].includes(label);
    matches.push({ role: isUser ? "user" : "assistant", start: m.index + m[0].length, end: m.index });
  }

  if (matches.length === 0) return out; // unstructured text — keep as transcript only

  for (let i = 0; i < matches.length; i++) {
    const segStart = matches[i].start;
    const segEnd = i + 1 < matches.length ? matches[i + 1].end : transcript.length;
    const content = transcript.slice(segStart, segEnd).trim();
    if (content) out.push({ role: matches[i].role, content });
  }
  return out;
}

function messagesToTranscript(messages: NormalizedVoicePayload["messages"]): string {
  return messages
    .map((msg) => `${msg.role === "user" ? "USER" : "AGENT"}: ${msg.content}`)
    .join("\n\n");
}

function extractVoicePayload(body: Record<string, unknown>): NormalizedVoicePayload {
  const data = (body.data && typeof body.data === "object" ? body.data : undefined) as Record<string, unknown> | undefined;
  const payload = (body.payload && typeof body.payload === "object" ? body.payload : undefined) as Record<string, unknown> | undefined;
  const call = (body.call && typeof body.call === "object" ? body.call : undefined) as Record<string, unknown> | undefined;
  // Unwrap nested: payload.call.*, data.call.*, payload.data.*
  const nestedPayload = payload?.payload && typeof payload.payload === "object" ? payload.payload as Record<string, unknown> : undefined;
  const payloadCall = payload?.call && typeof payload.call === "object" ? payload.call as Record<string, unknown> : undefined;
  const dataCall = data?.call && typeof data.call === "object" ? data.call as Record<string, unknown> : undefined;
  const nestedData = data?.data && typeof data.data === "object" ? data.data as Record<string, unknown> : undefined;
  const merged: Record<string, unknown> = { ...nestedData, ...dataCall, ...nestedPayload, ...payloadCall, ...call, ...payload, ...data, ...body };

  const agentId = String(pick(merged, ["agentId", "agent_id", "dograhAgentId", "assistantId"]) ?? "");
  const workflowRunId = String(pick(merged, ["workflowRunId", "workflow_run_id", "runId", "run_id"]) ?? "");
  const sessionId = String(pick(merged, ["sessionId", "session_id", "conversationId", "conversation_id"]) ?? "");
  const status = String(pick(merged, ["status", "callStatus", "call_status", "state"]) ?? "completed");
  const durationRaw = pick(merged, ["duration", "durationSeconds", "duration_seconds", "callDuration", "call_duration"]);
  const duration = typeof durationRaw === "number" ? durationRaw : parseFloat(String(durationRaw ?? "0")) || 0;
  const summary = String(pick(merged, ["summary", "callSummary", "call_summary", "recap"]) ?? "");

  let messages = normalizeMessages(
    pick(merged, ["messages", "transcript_segments", "transcriptSegments", "segments", "history", "conversation_history", "conversationHistory"])
  );

  let transcript = String(pick(merged, ["transcript", "transcription", "full_transcript", "fullTranscript", "conversation_transcript", "text"]) ?? "");

  // Bidirectional normalization — never lose content
  if (!transcript && messages.length > 0) {
    transcript = messagesToTranscript(messages);
  } else if (transcript && messages.length === 0) {
    messages = transcriptToMessages(transcript);
  }

  return { agentId, workflowRunId, sessionId, status, duration, transcript, summary, messages };
}

export async function POST(request: Request) {
  const headers = corsHeaders(request);
  try {
    const rawBody = await request.json();
    console.log("[Dograh Webhook] VOICE_WEBHOOK_RECEIVED:", JSON.stringify(rawBody).slice(0, 800));

    const body = rawBody as Record<string, unknown>;
    const {
      agentId,
      workflowRunId,
      sessionId,
      status,
      duration,
      transcript,
      summary,
      messages,
    } = extractVoicePayload(body);

    console.log("[Dograh Webhook] VOICE_PAYLOAD_NORMALIZED:", JSON.stringify({
      workflowRunId,
      sessionId,
      status,
      duration,
      transcriptLength: transcript?.length || 0,
      messageCount: messages.length,
    }));

    await connectToDatabase();

    // Find conversation by workflowRunId → sessionId → recent orphaned placeholder
    let filter: Record<string, unknown> | null = null;
    let orphanClaimed = false;

    if (workflowRunId) {
      const byRun = await Conversation.findOne({ "voiceAgent.workflowRunId": workflowRunId });
      if (byRun) filter = { _id: byRun._id };
    }
    if (!filter && sessionId) {
      const bySession = await Conversation.findOne({ sessionId });
      if (bySession) filter = { _id: bySession._id };
    }
    if (!filter) {
      // Claim the most recent empty voice placeholder for this agent created in the last 6 hours
      // (browser call-ended fires BEFORE the server webhook arrives)
      const orphan = await Conversation.findOne({
        channel: "voice",
        "voiceAgent.transcript": { $in: ["", null] },
        messages: { $size: 0 },
        createdAt: { $gte: new Date(Date.now() - 6 * 60 * 60 * 1000) },
      }).sort({ createdAt: -1 });

      if (orphan) {
        filter = { _id: orphan._id };
        orphanClaimed = true;
        console.log("[Dograh Webhook] VOICE_ORPHAN_CLAIMED: attached webhook data to browser-created record", orphan._id);
      }
    }

    if (!filter) {
      if (!sessionId && !workflowRunId) {
        return NextResponse.json({ error: "Missing sessionId or workflowRunId" }, { status: 400 });
      }
      filter = {}; // upsert will create a new doc
    }

    // Never overwrite existing content with empties (idempotency + retry safety)
    const existing = await Conversation.findOne(filter).catch(() => null);
    const hasExistingContent = existing && ((existing.messages?.length || 0) > 0 || !!existing.voiceAgent?.transcript);
    if (hasExistingContent && !transcript && messages.length === 0) {
      console.log("[Dograh Webhook] Skipping update — existing content present and incoming payload empty");
      return NextResponse.json({ success: true, conversationId: existing._id }, { headers });
    }

    const conversationData: Record<string, unknown> = {
      sessionId: sessionId || existing?.sessionId || `dograh_${workflowRunId || Date.now()}`,
      agentType: "voice-agent",
      channel: "voice",
      endedAt: new Date(),
      voiceAgent: {
        dograhAgentId: agentId || existing?.voiceAgent?.dograhAgentId || "",
        workflowRunId: workflowRunId || existing?.voiceAgent?.workflowRunId || "",
        durationSeconds: duration || existing?.voiceAgent?.durationSeconds || 0,
        callStatus: status || existing?.voiceAgent?.callStatus || "completed",
        transcript: transcript || existing?.voiceAgent?.transcript || "",
        summary: summary || existing?.voiceAgent?.summary || "",
      },
    };

    if (messages.length > 0) {
      conversationData.messages = messages.map((m) => ({
        role: m.role,
        content: m.content,
        timestamp: m.timestamp ? new Date(m.timestamp) : new Date(),
      }));
      conversationData.messageCount = messages.length;
    } else if (existing && (existing.messages?.length || 0) > 0) {
      // preserve existing messages on retries
      conversationData.messages = existing.messages;
      conversationData.messageCount = existing.messageCount || existing.messages.length;
    }

    console.log("[Dograh Webhook] VOICE_CONVERSATION_SAVING:", JSON.stringify({
      filterKeys: Object.keys(filter),
      orphanClaimed,
      savingMessages: Array.isArray(conversationData.messages) ? (conversationData.messages as unknown[]).length : 0,
      savingTranscriptLength: ((conversationData.voiceAgent as Record<string, unknown>).transcript as string)?.length || 0,
    }));

    const conversation = await Conversation.findOneAndUpdate(
      filter,
      { $set: conversationData },
      { upsert: true, new: true }
    );

    // Merge callerInfo with transcript extraction and context variables
    const callerInfo = (pick(body, ["callerInfo", "caller_info", "caller"]) || {}) as Record<string, unknown>;
    const ctxRaw = pick(body, ["context_variables", "contextVariables", "initial_context", "initialContext"]);
    const ctx = (ctxRaw && typeof ctxRaw === "object" ? ctxRaw : {}) as Record<string, unknown>;
    const extracted = extractCallerInfoFromTranscript(transcript || "", messages);
    const mergedCaller = {
      name: String(callerInfo.name || ctx.client_name || ctx.customer_name || extracted.name || ""),
      email: String(callerInfo.email || ctx.client_email || ctx.customer_email || extracted.email || ""),
      phone: String(callerInfo.phone || ctx.client_phone || ctx.customer_phone || extracted.phone || ""),
      company: String(callerInfo.company || ctx.company || ctx.client_company || extracted.company || ""),
      budget: extracted.budget || "",
      timeline: extracted.timeline || "",
      projectType: extracted.projectType || "",
      selectedOption: String(ctx.selected_option || ""),
    };

    // Auto-create lead, inquiry, client, and project if we have any caller info
    if (mergedCaller.email || mergedCaller.name) {
      const clientName = mergedCaller.name || "Voice Caller";
      const clientEmail = mergedCaller.email || `${clientName.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-voice-${Date.now()}@dynamic.local`;
      const clientPhone = mergedCaller.phone || "";
      const clientCompany = mergedCaller.company || "";

      // 1. Create Lead
      let leadId = null;
      if (clientEmail || clientName) {
        const existingLead = clientEmail
          ? await Lead.findOne({ email: clientEmail })
          : null;
        if (existingLead) {
          leadId = existingLead._id;
        } else {
          const lead = await Lead.create({
            name: clientName,
            email: clientEmail,
            phone: clientPhone,
            company: clientCompany,
            source: "voice-agent",
            status: "new",
            score: 60,
            requirements: summary || mergedCaller.projectType || "Inquiry from voice agent call",
            tags: ["voice-agent", "dograh"],
          });
          leadId = lead._id;
        }
      }

      // 2. Create Inquiry
      const inquiry = await Inquiry.create({
        name: clientName,
        email: clientEmail,
        phone: clientPhone,
        company: clientCompany,
        subject: `Voice Agent Call — ${mergedCaller.projectType || summary || "Inquiry"}`,
        message: transcript || summary || "Voice agent call completed",
        type: "sales",
        status: "new",
        priority: "medium",
        source: "voice-agent",
        lead: leadId,
        tags: ["voice-agent", "dograh"],
      });

      // 3. Create Client
      let client = null;
      if (clientEmail || clientName) {
        client = clientEmail
          ? await Client.findOne({ email: clientEmail })
          : null;
        if (!client) {
          client = await Client.create({
            name: clientName,
            email: clientEmail,
            phone: clientPhone,
            company: clientCompany,
            type: clientCompany ? "business" : "individual",
            status: "prospect",
            source: "voice-agent",
            notes: [
              summary ? `Summary: ${summary}` : "",
              mergedCaller.budget ? `Budget: ${mergedCaller.budget}` : "",
              mergedCaller.timeline ? `Timeline: ${mergedCaller.timeline}` : "",
              mergedCaller.projectType ? `Project type: ${mergedCaller.projectType}` : "",
            ].filter(Boolean).join(" | "),
            tags: ["voice-agent", "dograh"],
            totalProjects: 0,
            totalSpent: 0,
            lastContact: new Date(),
          });
        }
      }

      // 4. Match services and estimate prices
      const matchedServices = await matchServicesFromTranscript(transcript || "", summary || "");
      const budgetEstimate = estimateBudgetFromText(`${transcript || ""} ${summary || ""}`);

      // 5. Determine primary service for project
      const primaryService = matchedServices[0];
      const projectName = primaryService
        ? `${primaryService.name} — ${clientName}`
        : `Voice Agent Project — ${clientName}`;

      // Build estimated quote
      let estimatedQuote = budgetEstimate;
      if (!estimatedQuote && primaryService) {
        if (primaryService.tiers && primaryService.tiers.length > 0) {
          const prices = primaryService.tiers.map((t) => t.price);
          estimatedQuote = {
            min: Math.min(...prices),
            max: Math.max(...prices),
          };
        } else {
          estimatedQuote = {
            min: primaryService.basePrice,
            max: Math.round(primaryService.basePrice * 1.3),
          };
        }
      }

      // Build milestones from primary service
      const milestones = buildDefaultMilestones(
        primaryService?.category || "default",
        primaryService?.name || "Project"
      );

      // Calculate milestone amounts
      let milestoneAmounts: number[] = [];
      if (estimatedQuote) {
        const avg = (estimatedQuote.min + estimatedQuote.max) / 2;
        milestoneAmounts = milestones.map(() => Math.round(avg / milestones.length));
      }

      // 6. Create Project with Demo HTML
      const slug = slugify(projectName);
      const demoId = `demo-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

      const project = await Project.create({
        name: projectName,
        slug,
        title: projectName,
        description: summary || transcript?.slice(0, 500) || "Voice agent project",
        client: {
          name: clientName,
          email: clientEmail,
          phone: clientPhone,
          company: clientCompany,
        },
        status: "demo",
        priority: "medium",
        budget: estimatedQuote?.min || 0,
        currency: "USD",
        progress: 0,
        milestones: milestones.map((m, i) => ({
          ...m,
          amount: milestoneAmounts[i] || 0,
        })),
        requirements: {
          projectType: primaryService?.serviceKey || mergedCaller.projectType || "website",
          features: matchedServices.map((s) => s.name),
          budget: mergedCaller.budget || (estimatedQuote ? `$${estimatedQuote.min.toLocaleString()} - $${estimatedQuote.max.toLocaleString()}` : ""),
          timeline: mergedCaller.timeline || primaryService ? `${primaryService?.tiers?.[0]?.name || "Standard"}` : "",
        },
        demoId,
        quote: estimatedQuote
          ? {
              min: estimatedQuote.min,
              max: estimatedQuote.max,
              currency: "USD",
            }
          : undefined,
        tags: ["voice-agent", "dograh", ...matchedServices.map((s) => s.serviceKey)].filter(Boolean),
        notes: `Created by voice agent. Conversation: ${conversation._id}. Matched services: ${matchedServices.map((s) => s.name).join(", ") || "none detected"}`,
      });

      // Generate demo HTML with real project ID
      const demoRequirements = {
        projectType: primaryService?.serviceKey || mergedCaller.projectType || "website",
        name: clientName,
        email: clientEmail,
        features: matchedServices.map((s) => s.name),
        budget: mergedCaller.budget || (estimatedQuote ? `$${estimatedQuote.min.toLocaleString()} - $${estimatedQuote.max.toLocaleString()}` : ""),
        timeline: mergedCaller.timeline || "",
        description: summary || "",
        selectedOption: mergedCaller.selectedOption || "",
        company: clientCompany,
        phone: clientPhone,
      };
      const demoHTML = generateDemoHTML(demoRequirements, project._id.toString());
      project.demoHTML = demoHTML;
      await project.save();

      // Create secure preview token
      const { token: previewToken, tokenHash } = createPreviewToken();
      const previewExpiryMinutes = 5;
      const preview = await Preview.create({
        projectId: project._id,
        token: previewToken,
        tokenHash,
        status: "active",
        expiresAt: new Date(Date.now() + previewExpiryMinutes * 60 * 1000),
        accessCount: 0,
        maxAccesses: 10,
        paymentRequired: true,
        paymentStatus: "unpaid",
        accessLog: [
          {
            timestamp: new Date(),
            event: "PREVIEW_CREATED",
            details: `Created via Dograh webhook for ${clientName}`,
          },
        ],
      });

      // Link client to project
      if (client) {
        client.totalProjects = (client.totalProjects || 0) + 1;
        client.lastContact = new Date();
        await client.save();
      }

      // Update conversation with all links
      conversation.inquiryId = inquiry._id;
      if (leadId) conversation.leadId = leadId;
      conversation.projectId = project._id;
      conversation.projectName = projectName;
      if (estimatedQuote) {
        conversation.projectQuote = {
          min: estimatedQuote.min,
          max: estimatedQuote.max,
          currency: "USD",
        };
      }
      conversation.projectBrief = {
        projectType: primaryService?.serviceKey || "website",
        features: matchedServices.map((s) => s.name),
        budget: estimatedQuote ? `$${estimatedQuote.min.toLocaleString()} - $${estimatedQuote.max.toLocaleString()}` : "",
        timeline: primaryService?.tiers?.[0]?.name || "",
        clientName,
        clientEmail,
        clientPhone,
      };
      conversation.outcome = "project-created";
      await conversation.save();

      console.log("[Dograh Webhook] Created:", {
        lead: leadId,
        inquiry: inquiry._id,
        client: client?._id,
        project: project._id,
        quote: estimatedQuote,
        services: matchedServices.map((s) => s.name),
        demoId,
      });

      // Send preview email to client
      if (clientEmail && clientEmail.includes("@")) {
        const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://wall-v.com";
        const previewUrl = `${appUrl}/preview/${preview.token}`;
        const emailContent = projectCreatedEmail(projectName, clientName, previewUrl);
        sendEmail({ ...emailContent, to: clientEmail }).catch((err) =>
          console.error("[Dograh Webhook] Failed to send preview email:", err)
        );
      }

      return NextResponse.json({
        success: true,
        conversationId: conversation._id,
        leadId,
        inquiryId: inquiry._id,
        clientId: client?._id,
        projectId: project._id,
        demoId,
        previewUrl: `/preview/${preview.token}`,
        checkoutUrl: `/checkout/${project._id}`,
        quote: estimatedQuote,
      }, { headers });
    }

    return NextResponse.json({ success: true, conversationId: conversation._id }, { headers });
  } catch (error) {
    await logError({
      level: "error",
      message: "Error processing dograh webhook",
      source: "api/webhooks/dograh",
      stack: error instanceof Error ? error.stack : undefined,
    });
    return NextResponse.json({ error: "Webhook processing failed" }, { status: 500, headers });
  }
}
