import { NextRequest, NextResponse } from "next/server";
import Agent from "@/models/agent";
import AgentConversation from "@/models/agent-conversation";
import AgentExecution from "@/models/agent-execution";
import AgentMemory from "@/models/agent-memory";
import ProjectRequest from "@/models/project-request";
import Lead from "@/models/lead";
import connectToDatabase from "@/lib/mongodb";
import { findMatchingSkills, buildSkillContext } from "@/lib/agent-skills";
import { processHooks } from "@/lib/agent-hooks";
import { captureMemoriesFromMessage } from "@/lib/agent-memory";
import {
  analyzeSentiment,
  checkBlockedTopics,
  shouldEscalate,
  getSatisfactionSurvey,
  parseSatisfactionResponse,
  saveSatisfaction,
  estimateTokens,
} from "@/lib/agent-conversation-enhancements";

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

const MASTER_AGENT_SYSTEM_PROMPT = `You are the Master Client Agent for Wall-V, a leading digital agency. Your role is to guide clients through the project discovery and requirements gathering process.

## Your Process (Follow these steps in order):

1. **Greeting** - Welcome the client warmly, introduce yourself
2. **Project Type** - Ask what kind of project they need (website, web app, mobile app, AI solution, e-commerce, etc.)
3. **Objective** - Understand their business goal and what success looks like
4. **Features** - Discuss specific features and functionality needed
5. **Design & Brand** - Ask about design preferences, brand guidelines
6. **Industry & Audience** - Understand their industry and target users
7. **Integrations** - Ask about third-party tools they need connected
8. **Budget** - Discuss budget range (be sensitive, give ranges)
9. **Timeline** - Understand their deadline expectations
10. **Summary & Quote** - Present a summary and estimated quote
11. **Confirmation** - Get approval to create the project

## Rules:
- Be professional, warm, and consultative
- Ask ONE question at a time - never overwhelm with multiple questions
- If the client provides information unprompted, acknowledge it and don't re-ask
- After gathering enough info, summarize what you understand
- Generate an estimated quote based on Wall-V's pricing
- **IMPORTANT**: Before creating the project, you MUST collect the client's name and email. Never skip this step. If they haven't provided it yet, ask for it before confirming.
- When the client confirms, output a structured JSON block for project creation
- Keep responses concise and helpful
- If the client asks about pricing, give general ranges based on project type
- Always maintain context of the full conversation

## Wall-V Services & Pricing Guide:
- Basic Website: $500-$2,000
- Business Website: $2,000-$5,000
- E-commerce Store: $3,000-$10,000
- Custom Web Application: $5,000-$25,000
- AI Chatbot/Agent: $2,000-$10,000
- Mobile App: $5,000-$20,000
- Digital Marketing Package: $500-$3,000/month
- Custom AI Solution: $5,000-$50,000

When you have gathered all requirements and the client confirms, output a JSON block like:
\`\`\`json
{
  "action": "create_project_request",
  "client": { "name": "...", "email": "...", "phone": "...", "company": "..." },
  "requirements": {
    "projectType": "...",
    "objective": "...",
    "features": ["..."],
    "designStyle": "...",
    "industry": "...",
    "targetAudience": "...",
    "integrations": ["..."],
    "budget": { "min": 0, "max": 0, "currency": "USD" },
    "timeline": "...",
    "pages": ["..."],
    "specialRequirements": "..."
  }
}
\`\`\``;

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

  // Detect project type
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

  // Detect budget mentions
  const budgetMatch = allText.match(/\$[\d,]+/g);
  if (budgetMatch) {
    const amounts = budgetMatch.map((b) => parseInt(b.replace(/[$,]/g, "")));
    if (amounts.length >= 2) {
      state.budget = { min: Math.min(...amounts), max: Math.max(...amounts), currency: "USD" };
    } else if (amounts.length === 1) {
      state.budget = { min: amounts[0] * 0.8, max: amounts[0] * 1.2, currency: "USD" };
    }
  }

  // Detect features
  const featureKeywords = ["login", "signup", "payment", "dashboard", "admin", "search", "filter", "cart", "checkout", "blog", "contact form", "newsletter", "analytics", "notification", "chat", "api", "integration", "database", "user management", "role", "permission", "upload", "gallery", "video", "map", "review", "rating", "wishlist", "inventory", "report", "export", "import"];
  state.features = featureKeywords.filter((f) => allText.includes(f));

  // Detect timeline
  if (allText.includes("urgent") || allText.includes("asap") || allText.includes("quickly")) {
    state.timeline = "urgent";
  } else if (allText.includes("month")) {
    const monthMatch = allText.match(/(\d+)\s*month/);
    state.timeline = monthMatch ? `${monthMatch[1]} months` : "1-2 months";
  } else if (allText.includes("week")) {
    const weekMatch = allText.match(/(\d+)\s*week/);
    state.timeline = weekMatch ? `${weekMatch[1]} weeks` : "2-4 weeks";
  }

  // Determine conversation step
  if (!state.projectType) state.step = "identify-project";
  else if (!state.objective) state.step = "understand-goal";
  else if (state.features.length === 0) state.step = "discover-requirements";
  else if (!state.budget) state.step = "budget-timeline";
  else state.step = "generate-brief";

  return state;
}

export async function POST(request: NextRequest) {
  try {
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

    // Create or get conversation
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

    // Add user message
    conversation.messages.push({
      role: "user",
      content: message,
      timestamp: new Date(),
    });
    conversation.messageCount += 1;

    // Capture memories from user message (non-blocking)
    captureMemoriesFromMessage(
      agent._id.toString(),
      message,
      conversation._id.toString(),
      chatSessionId
    ).catch(() => {});

    // Parse conversation state
    const state = parseConversationState(
      conversation.messages.map((m: { role: string; content: string }) => ({
        role: m.role,
        content: m.content,
      }))
    );

    // ─── ENHANCEMENTS: Sentiment, Blocked Topics, Escalation ───
    const sentimentResult = analyzeSentiment(message);

    // Check blocked topics
    const blockedTopics = (agent as Record<string, unknown>).guardrails as Record<string, unknown> | undefined;
    const blockedTopicsList = (blockedTopics?.blockedTopics as string[]) || [];
    const blockedCheck = checkBlockedTopics(message, blockedTopicsList);

    // Check if escalation is needed
    const escalationCheck = shouldEscalate({
      message,
      sentiment: { score: sentimentResult.score, label: sentimentResult.label, trend: "stable" },
      blockedTopic: blockedCheck.blocked,
      conversationLength: conversation.messageCount,
    });

    // Handle escalation
    if (escalationCheck.escalate) {
      conversation.status = "escalated";
      conversation.escalatedTo = "human";
      conversation.escalatedAt = new Date();
      await conversation.save();

      return NextResponse.json({
        response: `I understand this is important to you. ${escalationCheck.reason === "Explicit escalation request" ? "Let me connect you with a human agent." : "I'm escalating this to a human agent who can better assist you."} A team member will reach out shortly. Is there anything else I can help with in the meantime?`,
        conversationId: conversation._id,
        sessionId: chatSessionId,
        messageCount: conversation.messageCount,
        state: state.step,
        escalation: {
          triggered: true,
          reason: escalationCheck.reason,
          priority: escalationCheck.priority,
        },
      });
    }

    // Handle blocked topics
    if (blockedCheck.blocked) {
      return NextResponse.json({
        response: "I appreciate your question, but I'm not able to discuss that topic. Is there something else I can help you with regarding our services or your project?",
        conversationId: conversation._id,
        sessionId: chatSessionId,
        messageCount: conversation.messageCount,
        state: state.step,
        blockedTopic: blockedCheck.matchedTopic,
      });
    }

    // Check for satisfaction response (if conversation is near end)
    if (state.step === "generate-brief" || state.step === "completed") {
      const satisfaction = parseSatisfactionResponse(message);
      if (satisfaction.score) {
        await saveSatisfaction(
          conversation._id.toString(),
          satisfaction.score,
          satisfaction.feedback
        );

        return NextResponse.json({
          response: satisfaction.score >= 4
            ? "Thank you for your positive feedback! We're glad we could help. Is there anything else you'd like to know about your project?"
            : "Thank you for your feedback. We appreciate it and will use it to improve our service. Is there anything else I can help you with?",
          conversationId: conversation._id,
          sessionId: chatSessionId,
          messageCount: conversation.messageCount,
          state: state.step,
          satisfaction: {
            score: satisfaction.score,
            feedback: satisfaction.feedback,
          },
        });
      }
    }

    // Process hooks for website chat
    try {
      await processHooks("website-chat", {
        message,
        conversation: {
          id: conversation._id,
          sessionId: chatSessionId,
          messageCount: conversation.messageCount,
        },
        visitor: visitor || {},
        context: context || {},
        state,
        agent: {
          id: agent._id,
          name: agent.name,
          role: agent.role,
        },
      }, agent._id.toString());
    } catch {
      // Hook processing is non-critical
    }

    // Build system prompt with state context
    const stateContext = `\n\n## Current Conversation State:
- Step: ${state.step}
- Project type: ${state.projectType || "not determined"}
- Features identified: ${state.features.length > 0 ? state.features.join(", ") : "none yet"}
- Budget: ${state.budget ? `$${state.budget.min}-$${state.budget.max}` : "not discussed"}
- Timeline: ${state.timeline || "not discussed"}

Guide the conversation naturally based on what information is still missing.`;

    // Find matching skills for this message
    const matchedSkills = await findMatchingSkills(agent._id.toString(), message);
    const skillContext = buildSkillContext(matchedSkills);

    const apiKey = process.env.OPENAI_API_KEY;
    let responseText = "";

    if (apiKey) {
      try {
        const aiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model: agent.aiModel || "gpt-4o",
            messages: [
              {
                role: "system",
                content: `Your name is "${agent.name}". Always introduce yourself by this exact name. Never use placeholder names like "[Your Name]".\n\n${agent.systemPrompt || MASTER_AGENT_SYSTEM_PROMPT}` + stateContext + (skillContext ? `\n\n${skillContext}` : ""),
              },
              ...conversation.messages.slice(-20).map((m: { role: string; content: string }) => ({
                role: m.role as "user" | "assistant",
                content: m.content,
              })),
            ],
            temperature: agent.temperature || 0.7,
            max_tokens: agent.maxTokens || 2048,
          }),
        });

        if (aiResponse.ok) {
          const data = await aiResponse.json();
          responseText = data.choices?.[0]?.message?.content || "";

          // Track token usage
          if (data.usage) {
            const promptTokens = data.usage.prompt_tokens || 0;
            const completionTokens = data.usage.completion_tokens || 0;
            conversation.tokenUsage = {
              prompt: promptTokens,
              completion: completionTokens,
              total: promptTokens + completionTokens,
            };
          } else {
            // Estimate tokens if not provided
            const systemPromptLen = (agent.systemPrompt || MASTER_AGENT_SYSTEM_PROMPT).length + stateContext.length + (skillContext?.length || 0);
            const promptTokens = estimateTokens(JSON.stringify(conversation.messages.slice(-20))) + estimateTokens(systemPromptLen.toString());
            const completionTokens = estimateTokens(responseText);
            conversation.tokenUsage = {
              prompt: promptTokens,
              completion: completionTokens,
              total: promptTokens + completionTokens,
            };
          }
        }
      } catch {
        // Fall through to default response
      }
    }

    if (!responseText) {
      // Default guided flow responses based on state
      const guidedResponses: Record<string, string> = {
        greeting: `Hello! I'm ${agent.name}, your project consultant at Wall-V. I'll help you bring your digital project to life.

To get started, could you tell me what type of project you're looking to build? For example:
- A business website
- An e-commerce store
- A custom web application
- An AI-powered solution
- A mobile app

What do you have in mind?`,
        "identify-project": `Great choice! A ${state.projectType || "project"} can really make an impact. 

Could you tell me more about the main goal? What business problem are you trying to solve, or what opportunity are you trying to capture?`,
        "understand-goal": `That makes sense. Now let's think about the specific features and functionality you'll need.

What key features are must-haves for this project? For example:
- User registration and login
- Payment processing
- Admin dashboard
- Search and filtering
- Contact forms
- Content management

What are the top features you need?`,
        "discover-requirements": `${state.features.length > 0 ? `I've noted these features: ${state.features.join(", ")}.` : "Let's talk about features."}

${!state.budget ? "Now, let's discuss your budget range. This helps us recommend the right solution. What budget range are you working with?" : "Is there anything else you'd like to add to the requirements?"}`,
        "budget-timeline": `Thank you for sharing your budget range of ${state.budget ? `$${state.budget.min.toLocaleString()} - $${state.budget.max.toLocaleString()}` : "TBD"}.

What's your ideal timeline for this project? Are there any hard deadlines we should know about?`,
        "generate-brief": `Excellent! Let me summarize what I've gathered:

**Project Type:** ${state.projectType || "To be confirmed"}
**Key Features:** ${state.features.length > 0 ? state.features.join(", ") : "To be confirmed"}
**Budget Range:** ${state.budget ? `$${state.budget.min.toLocaleString()} - $${state.budget.max.toLocaleString()}` : "To be confirmed"}
**Timeline:** ${state.timeline || "To be confirmed"}

Based on this, I can prepare a detailed project plan and quote. Would you like me to proceed?

Also, I'll need your:
- Full name
- Email address
- Phone number (optional)
- Company name (optional)

This helps us create your project brief.`,
      };

      responseText = guidedResponses[state.step] || guidedResponses.greeting;
    }

    // Check if AI response contains project creation request
    const jsonMatch = responseText.match(/```json\s*([\s\S]*?)```/);
    if (jsonMatch) {
      try {
        const projectData = JSON.parse(jsonMatch[1]);
        if (projectData.action === "create_project_request") {
          // Validate required fields before creating
          const clientName = projectData.client?.name || visitor?.name || "";
          const clientEmail = projectData.client?.email || visitor?.email || "";

          if (!clientName || !clientEmail) {
            // Missing required info — ask for it instead of crashing
            responseText = `I'd love to create this project for you, but I need a couple of details first:\n\n${!clientName ? "- **Your full name**\n" : ""}${!clientEmail ? "- **Your email address**\n" : ""}\nCould you please provide ${!clientName && !clientEmail ? "these" : "this"} so I can set everything up?`;
          } else {
            // Create lead
            const lead = await Lead.create({
              name: clientName,
              email: clientEmail,
              phone: projectData.client?.phone || visitor?.phone || "",
              source: "ai-agent",
              status: "qualified",
              budget: projectData.requirements?.budget?.max,
              requirements: JSON.stringify(projectData.requirements),
              serviceInterest: [projectData.requirements?.projectType],
            });

            // Create project request
            const projectRequest = await ProjectRequest.create({
              agent: agent._id,
              conversation: conversation._id,
              client: {
                name: clientName,
                email: clientEmail,
                phone: projectData.client?.phone || "",
                company: projectData.client?.company || "",
              },
              requirements: projectData.requirements,
              extractedData: {
                rawConversation: conversation.messages.map((m: { role: string; content: string }) => `${m.role}: ${m.content}`).join("\n"),
                keyDecisions: state.features,
                missingInformation: [],
                confidenceScore: 75,
              },
              status: "requirements-gathered",
            });

            conversation.lead = lead._id;
            conversation.outcome = "lead-created";
            conversation.outcomeDetails = {
              projectRequestId: projectRequest._id,
            };
          }
        }
      } catch {
        // Not valid JSON, continue normally
      }
    }

    // Add assistant message
    conversation.messages.push({
      role: "assistant",
      content: responseText,
      timestamp: new Date(),
    });
    conversation.messageCount += 1;
    await conversation.save();

    // Create execution log
    await AgentExecution.create({
      agent: agent._id,
      conversation: conversation._id,
      type: "chat",
      status: "completed",
      input: { message },
      output: { response: responseText },
      tokens: conversation.tokenUsage || { prompt: 0, completion: 0, total: 0 },
      cost: 0,
      duration: 0,
      retryCount: 0,
      maxRetries: 3,
      startedAt: new Date(),
      completedAt: new Date(),
    });

    // Update agent stats
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
