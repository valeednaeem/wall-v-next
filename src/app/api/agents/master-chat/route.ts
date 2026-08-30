import { NextRequest, NextResponse } from "next/server";
import Agent from "@/models/agent";
import AgentConversation from "@/models/agent-conversation";
import AgentExecution from "@/models/agent-execution";

import ProjectRequest from "@/models/project-request";
import User from "@/models/user";
import Client from "@/models/client";
import Project from "@/models/project";
import Invoice from "@/models/invoice";
import connectToDatabase from "@/lib/mongodb";
import { captureMemoriesFromMessage } from "@/lib/agent-memory";
import { executeAIRequest } from "@/lib/ai-execution-engine";
import { checkRateLimit, getClientIp, RATE_LIMITS, logSecurityEvent, sanitizeString, validateEmail } from "@/lib/security";

interface ConversationState {
  step: string;
  clientInfo: { name?: string; email?: string; phone?: string; company?: string };
  projectType?: string;
  objective?: string;
  features: string[];
  budget?: { min: number; max: number; currency: string };
  timeline?: string;
  designStyle?: string;
  industry?: string;
  targetAudience?: string;
  integrations: string[];
  pages: string[];
  techStack: string[];
  specialRequirements?: string;
  quoteGenerated: boolean;
  confirmedByClient: boolean;
}

function parseConversationState(messages: { role: string; content: string }[]): ConversationState {
  const state: ConversationState = {
    step: "greeting",
    clientInfo: {},
    features: [],
    integrations: [],
    pages: [],
    techStack: [],
    quoteGenerated: false,
    confirmedByClient: false,
  };

  const allText = messages.map((m) => m.content).join(" ").toLowerCase();
  const userMessages = messages.filter((m) => m.role === "user").map((m) => m.content);

  for (const msg of userMessages) {
    const emailMatch = msg.match(/[\w.+-]+@[\w-]+\.[\w.]+/i);
    if (emailMatch && !state.clientInfo.email) {
      state.clientInfo.email = emailMatch[0].toLowerCase();
    }

    const namePatterns = [
      /(?:my name is|i'?m|this is|i am|name'?s? is|called)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/i,
      /^([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)$/,
    ];
    for (const pattern of namePatterns) {
      const nameMatch = msg.match(pattern);
      if (nameMatch && !state.clientInfo.name) {
        const name = nameMatch[1].trim();
        const excludeWords = ["yes", "no", "sure", "okay", "ok", "thanks", "hello", "hi", "hey", "website", "web", "app", "project", "need", "want", "looking", "building", "create", "build"];
        if (!excludeWords.includes(name.toLowerCase()) && name.length > 1) {
          state.clientInfo.name = name;
        }
      }
    }

    const phoneMatch = msg.match(/(?:phone|tel|mobile|number)[:\s]*([+\d\s()-]{7,})/i) || msg.match(/(\+?\d{1,4}[\s-]?\d{6,})/);
    if (phoneMatch && !state.clientInfo.phone) {
      state.clientInfo.phone = phoneMatch[1] || phoneMatch[0];
    }

    const companyPatterns = [
      /(?:company|business|firm|organization|org)[:\s]+(.+?)(?:\.|,|$)/i,
      /(?:at|from|working at|working for)\s+([A-Z][\w\s&]+?)(?:\.|,|\s+(?:and|but|so|which|who)|$)/i,
    ];
    for (const pattern of companyPatterns) {
      const companyMatch = msg.match(pattern);
      if (companyMatch && !state.clientInfo.company) {
        state.clientInfo.company = companyMatch[1].trim();
      }
    }

    const objectivePatterns = [
      /(?:objective|goal|need|want to|looking to|trying to|purpose|aim)\s+(.+?)(?:\.|,|$)/i,
      /(?:i need|we need|i want|we want|i'?m looking|we'?re looking)\s+(.+?)(?:\.|,|$)/i,
    ];
    for (const pattern of objectivePatterns) {
      const objMatch = msg.match(pattern);
      if (objMatch && !state.objective) {
        state.objective = objMatch[1].trim();
      }
    }

    const confirmPatterns = /^(?:yes|yep|yeah|sure|go ahead|proceed|confirm|do it|let'?s go|i'?m in|absolutely|sounds good|perfect|great|that works|i agree|approved|create it|start|begin|looks good|fine|ok|okay)\b/i;
    if (confirmPatterns.test(msg.trim())) {
      state.confirmedByClient = true;
    }

    const industryPatterns = [
      /(?:industry|sector|field|niche)[:\s]+(.+?)(?:\.|,|$)/i,
      /(?:in the|in)\s+(healthcare|finance|education|retail|technology|tech|real estate|food|fashion|travel|automotive|manufacturing|media|entertainment|nonprofit|legal|construction|energy|agriculture|logistics|insurance)\s/i,
    ];
    for (const pattern of industryPatterns) {
      const indMatch = msg.match(pattern);
      if (indMatch && !state.industry) {
        state.industry = (indMatch[1] || indMatch[0]).trim();
      }
    }

    const audiencePatterns = [
      /(?:target audience|audience|users|customers|for)\s+(.+?)(?:\.|,|$)/i,
    ];
    for (const pattern of audiencePatterns) {
      const audMatch = msg.match(pattern);
      if (audMatch && !state.targetAudience) {
        state.targetAudience = audMatch[1].trim();
      }
    }
  }

  if (allText.includes("e-commerce") || allText.includes("ecommerce") || allText.includes("online store")) {
    state.projectType = "e-commerce";
  } else if (allText.includes("web app") || allText.includes("webapp") || allText.includes("application")) {
    state.projectType = "web-application";
  } else if (allText.includes("mobile app") || allText.includes("ios") || allText.includes("android")) {
    state.projectType = "mobile-app";
  } else if (allText.includes("ai") || allText.includes("chatbot") || allText.includes("machine learning")) {
    state.projectType = "ai-solution";
  } else if (allText.includes("website") || allText.includes("web page") || allText.includes("landing page")) {
    state.projectType = "website";
  }

  const budgetMatch = allText.match(/\$[\d,]+/g);
  if (budgetMatch) {
    const amounts = budgetMatch.map((b) => parseInt(b.replace(/[$,]/g, "")));
    if (amounts.length >= 2) {
      state.budget = { min: Math.min(...amounts), max: Math.max(...amounts), currency: "USD" };
    } else if (amounts.length === 1) {
      state.budget = { min: amounts[0] * 0.8, max: amounts[0] * 1.2, currency: "USD" };
    }
  }

  const featureKeywords = ["login", "signup", "payment", "dashboard", "admin", "search", "filter", "cart", "checkout", "blog", "contact form", "newsletter", "analytics", "notification", "chat", "api", "integration", "database", "user management", "role", "permission", "upload", "gallery", "video", "map", "review", "rating", "wishlist", "inventory", "report", "export", "import"];
  state.features = featureKeywords.filter((f) => allText.includes(f));

  if (allText.includes("urgent") || allText.includes("asap") || allText.includes("quickly")) {
    state.timeline = "urgent";
  } else if (allText.includes("month")) {
    const monthMatch = allText.match(/(\d+)\s*month/);
    state.timeline = monthMatch ? `${monthMatch[1]} months` : "1-2 months";
  } else if (allText.includes("week")) {
    const weekMatch = allText.match(/(\d+)\s*week/);
    state.timeline = weekMatch ? `${weekMatch[1]} weeks` : "2-4 weeks";
  }

  if (!state.projectType) state.step = "identify-project";
  else if (!state.objective) state.step = "understand-goal";
  else if (state.features.length === 0) state.step = "discover-requirements";
  else if (!state.budget) state.step = "budget-timeline";
  else state.step = "generate-brief";

  return state;
}

export async function POST(request: NextRequest) {
  const ip = getClientIp(request);
  const userAgent = request.headers.get("user-agent") || "unknown";

  try {
    const rateLimit = checkRateLimit(`master-chat:${ip}`, RATE_LIMITS.MASTER_CHAT.maxRequests, RATE_LIMITS.MASTER_CHAT.windowMs);
    if (!rateLimit.allowed) {
      await logSecurityEvent({
        type: "rate_limit_triggered",
        severity: "medium",
        ip,
        userAgent,
        path: "/api/agents/master-chat",
        method: "POST",
        details: { limit: "master_chat" },
        blocked: true,
      });
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        { status: 429 }
      );
    }

    await connectToDatabase();
    const { message, agentId, sessionId, visitor, context } = await request.json();

    if (!message || !agentId) {
      return NextResponse.json({ error: "message and agentId are required" }, { status: 400 });
    }

    const agent = await Agent.findById(agentId);
    if (!agent || agent.status !== "active") {
      return NextResponse.json({ error: "Agent not available" }, { status: 404 });
    }

    const chatSessionId = sessionId || `master-${Date.now()}-${Math.random().toString(36).slice(2)}`;

    let conversation = await AgentConversation.findOne({
      agent: agent._id,
      sessionId: chatSessionId,
      status: "active",
    });

    if (!conversation) {
      conversation = await AgentConversation.create({
        agent: agent._id,
        sessionId: chatSessionId,
        channel: "website",
        visitor: visitor || {},
        context: context || {},
        startedAt: new Date(),
        messageCount: 0,
        tokenUsage: { prompt: 0, completion: 0, total: 0 },
        cost: 0,
      });
    }

    conversation.messages.push({
      role: "user",
      content: message,
      timestamp: new Date(),
    });
    conversation.messageCount += 1;

    captureMemoriesFromMessage(
      agent._id.toString(),
      message,
      conversation._id.toString(),
      chatSessionId
    ).catch(() => {});

    const conversationHistory = conversation.messages.slice(-20).map(
      (m: { role: string; content: string }) => ({ role: m.role as "user" | "assistant", content: m.content })
    );

    const state = parseConversationState(conversationHistory);

    const result = await executeAIRequest({
      message,
      context: {
        userId: visitor?.userId,
        userRole: visitor?.role,
        visitorId: visitor?.id || `visitor-${Date.now()}`,
        visitorName: visitor?.name || "Visitor",
        visitorEmail: visitor?.email || "",
        channel: "website",
        conversationId: conversation._id.toString(),
        page: context?.page || "",
      },
      conversationHistory,
      agentId,
    });

    let responseText = result.response;

    if (!responseText) {
      const guidedResponses: Record<string, string> = {
        greeting: `Hello! I'm ${agent.name}, your project consultant at Wall-V. I'll help you bring your digital project to life.\n\nTo get started, could you tell me what type of project you're looking to build? For example:\n- A business website\n- An e-commerce store\n- A custom web application\n- An AI-powered solution\n- A mobile app\n\nWhat do you have in mind?`,
        "identify-project": `Great choice! A ${state.projectType || "project"} can really make an impact.\n\nCould you tell me more about the main goal? What business problem are you trying to solve, or what opportunity are you trying to capture?`,
        "understand-goal": `That makes sense. Now let's think about the specific features and functionality you'll need.\n\nWhat key features are must-haves for this project? For example:\n- User registration and login\n- Payment processing\n- Admin dashboard\n- Search and filtering\n- Contact forms\n- Content management\n\nWhat are the top features you need?`,
        "discover-requirements": `${state.features.length > 0 ? `I've noted these features: ${state.features.join(", ")}.` : "Let's talk about features."}\n\n${!state.budget ? "Now, let's discuss your budget range. This helps us recommend the right solution. What budget range are you working with?" : "Is there anything else you'd like to add to the requirements?"}`,
        "budget-timeline": `Thank you for sharing your budget range of ${state.budget ? `$${state.budget.min.toLocaleString()} - $${state.budget.max.toLocaleString()}` : "TBD"}.\n\nWhat's your ideal timeline for this project? Are there any hard deadlines we should know about?`,
        "generate-brief": `Excellent! Let me summarize what I've gathered:\n\n**Project Type:** ${state.projectType || "To be confirmed"}\n**Key Features:** ${state.features.length > 0 ? state.features.join(", ") : "To be confirmed"}\n**Budget Range:** ${state.budget ? `$${state.budget.min.toLocaleString()} - $${state.budget.max.toLocaleString()}` : "To be confirmed"}\n**Timeline:** ${state.timeline || "To be confirmed"}\n\nBased on this, I can prepare a detailed project plan and quote. Would you like me to proceed?\n\nAlso, I'll need your:\n- Full name\n- Email address\n- Phone number (optional)\n- Company name (optional)\n\nThis helps us create your project brief.`,
      };

      responseText = guidedResponses[state.step] || guidedResponses.greeting;
    }

    // ─── Project Creation (post-processing) ──────────────────────────────
    const jsonMatch = responseText.match(/```json\s*([\s\S]*?)```/);
    let projectData: Record<string, unknown> | null = null;

    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[1]);
        if (parsed.action === "create_project_request") {
          projectData = parsed;
        }
      } catch { /* ignore */ }
    }

    if (!projectData && state.confirmedByClient) {
      const confirmationPatterns = /(?:proceed|create|confirm|go ahead|start|begin|set up|build|do it|let'?s go|absolutely|yes please|sounds good|perfect|great|that works|i agree|approved)/i;
      if (confirmationPatterns.test(responseText) && state.projectType && state.clientInfo?.name && state.clientInfo?.email) {
        projectData = {
          action: "create_project_request",
          client: {
            name: state.clientInfo.name,
            email: state.clientInfo.email,
            phone: state.clientInfo.phone || "",
            company: state.clientInfo.company || "",
          },
          requirements: {
            projectType: state.projectType,
            objective: state.objective || "",
            features: state.features || [],
            designStyle: state.designStyle || "",
            industry: state.industry || "",
            targetAudience: state.targetAudience || "",
            integrations: state.integrations || [],
            budget: state.budget || { min: 0, max: 0, currency: "USD" },
            timeline: state.timeline || "",
            pages: state.pages || [],
            specialRequirements: state.specialRequirements || "",
          },
        };
      }
    }

    if (!projectData) {
      const lastUserMsg = conversation.messages.filter((m: { role: string }) => m.role === "user").slice(-1)[0]?.content?.toLowerCase() || "";
      const explicitYes = /^(?:yes|yep|yeah|sure|go ahead|proceed|confirm|do it|let'?s go|i'?m in|absolutely|sounds good|perfect|that works|i agree|approved|create it|start|begin)\b/i.test(lastUserMsg);
      if (explicitYes && state.projectType && state.clientInfo?.name && state.clientInfo?.email) {
        projectData = {
          action: "create_project_request",
          client: {
            name: state.clientInfo.name,
            email: state.clientInfo.email,
            phone: state.clientInfo.phone || "",
            company: state.clientInfo.company || "",
          },
          requirements: {
            projectType: state.projectType,
            objective: state.objective || "",
            features: state.features || [],
            designStyle: state.designStyle || "",
            industry: state.industry || "",
            targetAudience: state.targetAudience || "",
            integrations: state.integrations || [],
            budget: state.budget || { min: 0, max: 0, currency: "USD" },
            timeline: state.timeline || "",
            pages: state.pages || [],
            specialRequirements: state.specialRequirements || "",
          },
        };
      }
    }

    if (projectData) {
      try {
        const clientName = (projectData.client as Record<string, string>)?.name || visitor?.name || "";
        const clientEmail = (projectData.client as Record<string, string>)?.email || visitor?.email || "";

        if (!clientName || !clientEmail) {
          responseText = `I'd love to create this project for you, but I need a couple of details first:\n\n${!clientName ? "- **Your full name**\n" : ""}${!clientEmail ? "- **Your email address**\n" : ""}\nCould you please provide ${!clientName && !clientEmail ? "these" : "this"} so I can set everything up?`;
        } else {
          const pdClient = projectData.client as Record<string, string> || {};
          const pdReqs = projectData.requirements as Record<string, unknown> || {};
          const pdBudget = (pdReqs.budget || {}) as { min?: number; max?: number; currency?: string };

          const safeClientName = sanitizeString(clientName, 100);
          const safeClientEmail = sanitizeString(clientEmail, 254).toLowerCase();
          if (!safeClientName || !safeClientEmail || !validateEmail(safeClientEmail)) {
            responseText = "I need a valid name and email address to create your account. Could you please provide them?";
          } else {
            let user = await User.findOne({ email: safeClientEmail });
            const isNewUser = !user;
            if (!user) {
              const bcrypt = (await import("bcryptjs")).default;
              const tempPassword = await bcrypt.hash("WallV@" + Date.now(), 12);
              const baseSlug = safeClientName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
              user = await User.create({
                name: safeClientName,
                email: safeClientEmail,
                password: tempPassword,
                slug: `${baseSlug}-${Date.now()}`,
                role: "customer",
                isActive: true,
                isEmailVerified: false,
                phone: sanitizeString(pdClient.phone || visitor?.phone || "", 20),
                company: sanitizeString(pdClient.company || "", 100),
              });
            }

            let client = await Client.findOne({ email: safeClientEmail });
            if (!client) {
              client = await Client.create({
                user: user._id,
                name: safeClientName,
                email: safeClientEmail,
                phone: sanitizeString(pdClient.phone || visitor?.phone || "", 20),
                company: sanitizeString(pdClient.company || "", 100),
                source: "ai-agent",
                status: "active",
                type: pdClient.company ? "business" : "individual",
                lastContact: new Date(),
              });
            } else if (!client.user) {
              client.user = user._id;
              await client.save();
            }

            const budget = pdBudget.max || pdBudget.min ? pdBudget : (state?.budget || { min: 0, max: 0, currency: "USD" });
            const budgetMax = budget.max || budget.min || 0;
            const projectTypeRaw = (pdReqs.projectType as string) || state?.projectType || "other";
            const projectTypeMap: Record<string, string> = {
              "website": "web-development",
              "web app": "web-development",
              "web application": "web-development",
              "mobile app": "mobile-app",
              "ai solution": "ai-solution",
              "ai/automation": "ai-solution",
              "e-commerce": "e-commerce",
              "ecommerce": "e-commerce",
              "hosting": "hosting",
            };
            const projectType = projectTypeMap[projectTypeRaw.toLowerCase()] || "other";

            const projectName = `${projectTypeRaw} - ${safeClientName}`;
            const projectSlug = projectName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

            const project = await Project.create({
              name: projectName,
              slug: `${projectSlug}-${Date.now()}`,
              description: (pdReqs.objective as string) || state?.objective || `${projectTypeRaw} project for ${safeClientName}`,
              client: { name: safeClientName, email: safeClientEmail, phone: sanitizeString(pdClient.phone || "", 20) },
              clientRef: client._id,
              projectType: projectType as "web-development" | "mobile-app" | "ai-solution" | "e-commerce" | "hosting" | "other",
              status: "new",
              lifecycleStatus: "project-created",
              priority: "medium",
              budget: budgetMax,
              currency: budget.currency || "USD",
              conversationRef: conversation._id,
              agentRef: agent._id,
              scope: {
                description: (pdReqs.objective as string) || state?.objective || "",
                features: state?.features || [],
                exclusions: [],
                assumptions: [],
                constraints: [],
                version: 1,
              },
              financial: {
                quotedAmount: budgetMax,
                approvedAmount: 0,
                invoicedAmount: 0,
                paidAmount: 0,
                outstandingAmount: 0,
                overdueAmount: 0,
                currency: budget.currency || "USD",
              },
            });

            client.totalProjects = (client.totalProjects || 0) + 1;
            await client.save();

            const invoiceItems = (state?.features?.length ? state.features : ["Project Development"]).map((feat: string) => ({
              description: feat,
              quantity: 1,
              unitPrice: budgetMax / (state?.features?.length || 1),
              total: budgetMax / (state?.features?.length || 1),
              category: "development",
            }));

            const invoiceCount = await Invoice.countDocuments();
            const invoiceNumber = `INV-${String(invoiceCount + 1).padStart(5, "0")}`;
            const dueDate = new Date();
            dueDate.setDate(dueDate.getDate() + 30);

            const invoice = await Invoice.create({
              invoiceNumber,
              client: client._id,
              project: project._id,
              items: invoiceItems,
              subtotal: budgetMax,
              tax: 0,
              taxRate: 0,
              discount: 0,
              total: budgetMax,
              amountPaid: 0,
              amountDue: budgetMax,
              currency: budget.currency || "USD",
              status: "draft",
              type: "standard",
              dueDate,
              notes: `Project: ${projectName}`,
              billingAddress: {
                name: safeClientName,
                email: safeClientEmail,
                address: "",
                city: "",
                country: "",
              },
            });

            project.lifecycleStatus = "invoiced";
            project.financial.invoicedAmount = budgetMax;
            project.financial.outstandingAmount = budgetMax;
            await project.save();

            const projectRequest = await ProjectRequest.create({
              agent: agent._id,
              conversation: conversation._id,
              client: {
                name: safeClientName,
                email: safeClientEmail,
                phone: sanitizeString(pdClient.phone || "", 20),
                company: pdClient.company || "",
              },
              requirements: pdReqs as Record<string, unknown>,
              extractedData: {
                rawConversation: conversation.messages.map((m: { role: string; content: string }) => `${m.role}: ${m.content}`).join("\n"),
                keyDecisions: state?.features || [],
                missingInformation: [],
                confidenceScore: 85,
              },
              status: "project-created",
              project: project._id,
              quote: { min: budgetMax * 0.8, max: budgetMax, currency: budget.currency || "USD" },
            });

            conversation.outcome = "project-created";
            conversation.outcomeDetails = {
              projectId: project._id.toString(),
              clientId: client._id.toString(),
              invoiceId: invoice._id.toString(),
              projectRequestId: projectRequest._id.toString(),
              userId: user._id.toString(),
              isNewUser,
            };

            responseText = `Your project has been created successfully.\n\n**Project:** ${projectName}\n**Invoice:** ${invoiceNumber} — $${budgetMax.toLocaleString()}\n**Status:** Pending Payment\n\n${isNewUser ? `An account has been created for you. You can log in at wall-v.com using your email and the temporary password that will be sent to you.\n\n` : ""}You can track your project and make payment from your dashboard at wall-v.com/dashboard.\n\nIs there anything else you'd like help with?`;
          }
        }
      } catch (err) {
        console.error("Project creation error:", err);
        responseText = "I encountered an issue while creating your project. Our team has been notified and will follow up shortly. Could you also email us at support@wall-v.com so we can assist you directly?";
      }
    }

    conversation.messages.push({
      role: "assistant",
      content: responseText,
      timestamp: new Date(),
    });
    conversation.messageCount += 1;
    await conversation.save();

    await AgentExecution.create({
      agent: agent._id,
      conversation: conversation._id,
      type: "chat",
      status: "completed",
      input: { message },
      output: { response: responseText },
      tokens: result.tokenUsage || { prompt: 0, completion: 0, total: 0 },
      cost: result.cost || 0,
      duration: result.duration || 0,
      retryCount: 0,
      maxRetries: 3,
      startedAt: new Date(Date.now() - (result.duration || 0)),
      completedAt: new Date(),
    });

    agent.stats.totalConversations = (agent.stats.totalConversations || 0) + (conversation.messageCount <= 2 ? 1 : 0);
    agent.stats.totalMessages = (agent.stats.totalMessages || 0) + 1;
    agent.stats.lastActive = new Date();
    await agent.save();

    return NextResponse.json({
      response: responseText,
      conversationId: conversation._id,
      sessionId: chatSessionId,
      messageCount: conversation.messageCount,
      state: state.step,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Master agent chat failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
