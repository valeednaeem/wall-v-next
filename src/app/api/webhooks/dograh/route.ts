import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import Conversation from "@/models/conversation";
import Lead from "@/models/lead";
import Inquiry from "@/models/inquiry";
import Client from "@/models/client";
import Project from "@/models/project";
import ServicePrice from "@/models/service-price";

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "") + `-${Date.now()}`;
}

function extractCallerInfoFromTranscript(
  transcript: string,
  messages?: { role: string; content: string }[]
): { name?: string; email?: string; phone?: string } {
  const text = (transcript || "").toLowerCase();
  let name: string | undefined;
  let email: string | undefined;
  let phone: string | undefined;

  // Extract email
  const emailMatch = transcript.match(/[\w.+-]+@[\w-]+\.[\w.-]+/);
  if (emailMatch) email = emailMatch[0];

  // Extract phone (US format)
  const phoneMatch = transcript.match(/(?:\+?1[\s.-]?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}/);
  if (phoneMatch) phone = phoneMatch[0].trim();

  // Try to extract name from messages (more reliable than full transcript)
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
        // Filter out common false positives
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

  return { name, email, phone };
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

export async function POST(request: Request) {
  try {
    const body = await request.json();
    console.log("[Dograh Webhook] Received:", JSON.stringify(body).slice(0, 500));

    const {
      agentId,
      workflowRunId,
      status,
      duration,
      transcript,
      summary,
      sessionId,
      messages,
      callerInfo,
    } = body;

    await connectToDatabase();

    // Find or create conversation
    const filter = workflowRunId
      ? { "voiceAgent.workflowRunId": workflowRunId }
      : sessionId
        ? { sessionId }
        : null;

    if (!filter) {
      return NextResponse.json({ error: "Missing sessionId or workflowRunId" }, { status: 400 });
    }

    const conversationData: Record<string, unknown> = {
      sessionId: sessionId || `dograh_${workflowRunId || Date.now()}`,
      agentType: "voice-agent",
      channel: "voice",
      endedAt: new Date(),
      voiceAgent: {
        dograhAgentId: agentId || "",
        workflowRunId: workflowRunId || "",
        durationSeconds: duration || 0,
        callStatus: status || "completed",
        transcript: transcript || "",
        summary: summary || "",
      },
    };

    if (messages && Array.isArray(messages)) {
      conversationData.messages = messages.map((m: { role: string; content: string; timestamp?: string }) => ({
        role: m.role === "user" ? "user" : "assistant",
        content: m.content,
        timestamp: m.timestamp ? new Date(m.timestamp) : new Date(),
      }));
      conversationData.messageCount = messages.length;
    }

    const conversation = await Conversation.findOneAndUpdate(
      filter,
      { $set: conversationData },
      { upsert: true, new: true }
    );

    // Merge callerInfo with transcript extraction
    const extracted = extractCallerInfoFromTranscript(transcript || "", messages);
    const mergedCaller = {
      name: callerInfo?.name || extracted.name || "",
      email: callerInfo?.email || extracted.email || "",
      phone: callerInfo?.phone || extracted.phone || "",
    };

    // Auto-create lead, inquiry, client, and project if we have any caller info
    if (mergedCaller.email || mergedCaller.name) {
      const clientName = mergedCaller.name || "Voice Caller";
      const clientEmail = mergedCaller.email || `${clientName.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-voice-${Date.now()}@dynamic.local`;
      const clientPhone = mergedCaller.phone || "";

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
            source: "voice-agent",
            status: "new",
            score: 60,
            requirements: summary || "Inquiry from voice agent call",
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
        subject: `Voice Agent Call — ${summary || "Inquiry"}`,
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
            type: "individual",
            status: "prospect",
            source: "voice-agent",
            notes: `Created from voice agent call. Summary: ${summary || "N/A"}`,
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

      // 6. Create Project
      const slug = slugify(projectName);
      const project = await Project.create({
        name: projectName,
        slug,
        title: projectName,
        description: summary || transcript?.slice(0, 500) || "Voice agent project",
        client: {
          name: clientName,
          email: clientEmail,
        },
        status: "planning",
        priority: "medium",
        budget: estimatedQuote?.min || 0,
        currency: "USD",
        progress: 0,
        milestones: milestones.map((m, i) => ({
          ...m,
          amount: milestoneAmounts[i] || 0,
        })),
        requirements: {
          projectType: primaryService?.serviceKey || "website",
          features: matchedServices.map((s) => s.name),
          budget: estimatedQuote ? `$${estimatedQuote.min.toLocaleString()} - $${estimatedQuote.max.toLocaleString()}` : "",
          timeline: primaryService ? `${primaryService.tiers?.[0]?.name || "Standard"}` : "",
        },
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
      });

      return NextResponse.json({
        success: true,
        conversationId: conversation._id,
        leadId,
        inquiryId: inquiry._id,
        clientId: client?._id,
        projectId: project._id,
        quote: estimatedQuote,
      });
    }

    return NextResponse.json({ success: true, conversationId: conversation._id });
  } catch (error) {
    console.error("[Dograh Webhook] Error:", error);
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: "Webhook processing failed", detail: message }, { status: 500 });
  }
}
