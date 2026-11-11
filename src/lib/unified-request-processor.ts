import connectToDatabase from "@/lib/mongodb";
import Agent from "@/models/agent";
import AgentConversation from "@/models/agent-conversation";
import AgentExecution from "@/models/agent-execution";
import AgentSkill from "@/models/agent-skill";
import { classifyRequest, resolveCapabilities, type ClassifiedRequest, type CapabilityDefinition } from "@/lib/capability-registry";
import { resolveAgents, type ResolvedAgent } from "@/lib/agent-resolver";
import { runAgentWithTools } from "@/lib/agent-tools";

export interface RequestContext {
  userId?: string;
  userRole?: string;
  visitorId?: string;
  visitorName?: string;
  visitorEmail?: string;
  channel: "chat" | "voice" | "website" | "dashboard";
  conversationId?: string;
  projectId?: string;
  page?: string;
}

export interface RequirementGatheringState {
  step: number;
  totalSteps: number;
  projectType: string;
  objective: string;
  features: string[];
  budget: string;
  timeline: string;
  industry: string;
  targetAudience: string;
  clientName: string;
  clientEmail: string;
  clientPhone: string;
  clientCompany: string;
  designPreferences: string[];
  integrations: string[];
  additionalNotes: string;
  isComplete: boolean;
  confirmedByClient: boolean;
}

export interface ProcessRequestInput {
  message: string;
  context: RequestContext;
  conversationHistory?: { role: "user" | "assistant"; content: string }[];
}

export interface ProcessRequestResult {
  success: boolean;
  response: string;
  classified: ClassifiedRequest;
  capability: CapabilityDefinition | null;
  agent: ResolvedAgent | null;
  conversationId: string;
  executionId: string | null;
  requirements: RequirementGatheringState | null;
  projectCreated: boolean;
  projectId: string | null;
  requiresConfirmation: boolean;
  error?: string;
}

const GATHERING_STEPS = [
  { field: "projectType", question: "What type of project do you need? (e.g., website, mobile app, logo, marketing campaign)" },
  { field: "objective", question: "What is the main goal or purpose of this project?" },
  { field: "features", question: "What key features or deliverables do you need?" },
  { field: "targetAudience", question: "Who is your target audience or customer?" },
  { field: "budget", question: "Do you have a budget range in mind?" },
  { field: "timeline", question: "What is your preferred timeline?" },
  { field: "additionalNotes", question: "Is there anything else I should know about your project?" },
];

function parseGatheringResponse(message: string, state: RequirementGatheringState): Partial<RequirementGatheringState> {
  const updates: Partial<RequirementGatheringState> = {};
  const lower = message.toLowerCase();

  const currentStep = GATHERING_STEPS[state.step];
  if (!currentStep) return updates;

  switch (currentStep.field) {
    case "projectType":
      if (lower.includes("website") || lower.includes("web")) updates.projectType = "website";
      else if (lower.includes("mobile") || lower.includes("app")) updates.projectType = "mobile-app";
      else if (lower.includes("logo")) updates.projectType = "logo-design";
      else if (lower.includes("video")) updates.projectType = "video";
      else if (lower.includes("marketing") || lower.includes("campaign")) updates.projectType = "marketing-campaign";
      else if (lower.includes("seo")) updates.projectType = "seo";
      else if (lower.includes("brand")) updates.projectType = "branding";
      else if (lower.includes("design")) updates.projectType = "design";
      else if (lower.includes("content") || lower.includes("blog")) updates.projectType = "content";
      else if (lower.includes("ecommerce") || lower.includes("e-commerce") || lower.includes("store")) updates.projectType = "ecommerce";
      else if (lower.includes("saas") || lower.includes("software") || lower.includes("platform")) updates.projectType = "saas";
      else updates.projectType = message.trim();
      break;
    case "objective":
      updates.objective = message.trim();
      break;
    case "features":
      updates.features = message.split(/[,;]+/).map((f) => f.trim()).filter(Boolean);
      break;
    case "targetAudience":
      updates.targetAudience = message.trim();
      break;
    case "budget":
      updates.budget = message.trim();
      break;
    case "timeline":
      updates.timeline = message.trim();
      break;
    case "additionalNotes":
      updates.additionalNotes = message.trim();
      updates.isComplete = true;
      break;
  }

  return updates;
}

function buildGatheringPrompt(state: RequirementGatheringState): string {
  const completedInfo = [
    state.projectType ? `Project Type: ${state.projectType}` : "",
    state.objective ? `Objective: ${state.objective}` : "",
    state.features.length > 0 ? `Features: ${state.features.join(", ")}` : "",
    state.targetAudience ? `Target Audience: ${state.targetAudience}` : "",
    state.budget ? `Budget: ${state.budget}` : "",
    state.timeline ? `Timeline: ${state.timeline}` : "",
    state.additionalNotes ? `Additional Notes: ${state.additionalNotes}` : "",
  ].filter(Boolean).join("\n");

  const nextStep = GATHERING_STEPS[state.step];

  return [
    "You are a Wall-V project consultant. You are gathering requirements for a project.",
    "",
    "Collected so far:",
    completedInfo || "(nothing yet)",
    "",
    state.step < GATHERING_STEPS.length
      ? `Ask the client: ${nextStep.question}`
      : "Summarize the requirements and ask the client to confirm. Say 'CONFIRM' when they agree.",
    "",
    "Be conversational and helpful. Don't ask for information you already have.",
  ].join("\n");
}

function isConfirmationResponse(message: string): boolean {
  const lower = message.toLowerCase().trim();
  return ["yes", "confirm", "confirmed", "looks good", "that's correct", "go ahead", "proceed", "approve", "approved", "ok", "okay", "yep", "sure", "sounds good"].some((w) => lower === w || lower.startsWith(w));
}

export async function processRequest(input: ProcessRequestInput): Promise<ProcessRequestResult> {
  try {
    await connectToDatabase();

    const classified = classifyRequest(input.message);
    const capabilities = resolveCapabilities(classified);
    const primaryCapability = capabilities[0] || null;

    let resolution = null;
    if (primaryCapability) {
      resolution = await resolveAgents(
        classified,
        primaryCapability,
        input.context.userRole,
        [],
        3
      );
    }

    let conversation = null;
    const sessionId = input.context.conversationId || `chat-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    if (input.context.conversationId) {
      conversation = await AgentConversation.findById(input.context.conversationId);
    }

    if (!conversation && resolution?.primaryAgent) {
      conversation = await AgentConversation.create({
        agent: resolution.primaryAgent.agentId,
        sessionId,
        channel: input.context.channel,
        status: "active",
        visitor: {
          id: input.context.visitorId || input.context.userId || "anonymous",
          name: input.context.visitorName || "Anonymous",
          email: input.context.visitorEmail || "",
        },
        context: {
          page: input.context.page || "",
          language: "en",
          metadata: {
            requestType: classified.requestType,
            capabilityId: primaryCapability?.id,
          },
        },
        messages: [],
        requestedBy: input.context.userId || null,
      });
    }

    if (conversation) {
      conversation.messages.push({
        role: "user",
        content: input.message,
        timestamp: new Date(),
      });
      await conversation.save();
    }

    let executionId: string | null = null;
    let response = "";
    let requirements: RequirementGatheringState | null = null;
    let projectCreated = false;
    let projectId: string | null = null;
    let requiresConfirmation = false;

    if (resolution?.primaryAgent) {
      const agent = await Agent.findById(resolution.primaryAgent.agentId);
      if (agent) {
        const existingState = conversation?.context?.metadata?.gatheringState as RequirementGatheringState | undefined;
        const needsGathering = classified.requiresProject && (!existingState || !existingState.isComplete);

        if (needsGathering && existingState) {
          const updates = parseGatheringResponse(input.message, existingState);
          requirements = { ...existingState, ...updates };
          if (!requirements.isComplete) {
            requirements.step = Math.min(existingState.step + 1, GATHERING_STEPS.length - 1);
          }
          if (conversation) {
            (conversation.context.metadata as Record<string, unknown>).gatheringState = requirements;
            await conversation.save();
          }

          if (requirements.isComplete && !requirements.confirmedByClient) {
            if (isConfirmationResponse(input.message)) {
              requirements.confirmedByClient = true;
              requiresConfirmation = false;
              response = "Requirements confirmed! Let me create your project...";
            } else {
              requiresConfirmation = true;
              const summary = [
                "**Project Summary:**",
                `Type: ${requirements.projectType}`,
                `Objective: ${requirements.objective}`,
                `Features: ${requirements.features.join(", ")}`,
                `Target Audience: ${requirements.targetAudience}`,
                `Budget: ${requirements.budget}`,
                `Timeline: ${requirements.timeline}`,
                requirements.additionalNotes ? `Notes: ${requirements.additionalNotes}` : "",
                "",
                "Does this look correct? Reply 'confirm' to proceed or tell me what to change.",
              ].filter(Boolean).join("\n");
              response = summary;
            }
          } else {
            const nextStep = GATHERING_STEPS[requirements.step];
            response = nextStep ? nextStep.question : "Thank you! Let me process your requirements.";
          }
        } else if (needsGathering && !existingState) {
          requirements = {
            step: 0,
            totalSteps: GATHERING_STEPS.length,
            projectType: "",
            objective: "",
            features: [],
            budget: "",
            timeline: "",
            industry: "",
            targetAudience: "",
            clientName: input.context.visitorName || "",
            clientEmail: input.context.visitorEmail || "",
            clientPhone: "",
            clientCompany: "",
            designPreferences: [],
            integrations: [],
            additionalNotes: "",
            isComplete: false,
            confirmedByClient: false,
          };

          const updates = parseGatheringResponse(input.message, requirements);
          requirements = { ...requirements, ...updates };

          if (conversation) {
            (conversation.context.metadata as Record<string, unknown>).gatheringState = requirements;
            await conversation.save();
          }

          if (requirements.projectType) {
            requirements.step = 1;
            response = GATHERING_STEPS[1]?.question || "Tell me more about your project.";
          } else {
            response = GATHERING_STEPS[0].question;
          }
        } else {
          const systemPrompt = agent.systemPrompt || `You are ${agent.name}, a helpful AI assistant.`;
          const messages = [
            { role: "system" as const, content: systemPrompt },
            ...(input.conversationHistory || []).slice(-10),
            { role: "user" as const, content: input.message },
          ];

          const result = await runAgentWithTools({
            systemPrompt,
            messages,
            model: agent.aiModel || "gpt-4o",
            temperature: agent.temperature || 0.7,
            maxTokens: agent.maxTokens || 2048,
          });

          response = result.response;
        }

        if (conversation) {
          conversation.messages.push({
            role: "assistant",
            content: response,
            timestamp: new Date(),
          });
          await conversation.save();
        }

        const execution = await AgentExecution.create({
          agent: agent._id,
          conversation: conversation?._id,
          type: "chat",
          status: "completed",
          requestedBy: input.context.userId || null,
          input: { message: input.message },
          output: { response },
          tokens: { prompt: 0, completion: 0, total: 0 },
          cost: 0,
          duration: 0,
          startedAt: new Date(),
          completedAt: new Date(),
        });
        executionId = execution._id.toString();

        if (requirements?.confirmedByClient && classified.requiresProject) {
          response += "\n\n_project_create:" + JSON.stringify({
            projectType: requirements.projectType,
            objective: requirements.objective,
            features: requirements.features,
            budget: requirements.budget,
            timeline: requirements.timeline,
            targetAudience: requirements.targetAudience,
          });
        }
      }
    } else {
      response = primaryCapability
        ? `I understand you need help with ${primaryCapability.name}. Let me connect you with the right specialist.`
        : "I'd be happy to help! Could you tell me more about what you need?";
    }

    return {
      success: true,
      response,
      classified,
      capability: primaryCapability,
      agent: resolution?.primaryAgent || null,
      conversationId: conversation?._id.toString() || sessionId,
      executionId,
      requirements,
      projectCreated,
      projectId,
      requiresConfirmation,
    };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Processing failed";
    return {
      success: false,
      response: "I'm sorry, something went wrong. Please try again.",
      classified: classifyRequest(input.message),
      capability: null,
      agent: null,
      conversationId: "",
      executionId: null,
      requirements: null,
      projectCreated: false,
      projectId: null,
      requiresConfirmation: false,
      error: msg,
    };
  }
}
