/**
 * Canonical AI Execution Engine
 *
 * THE single entry point for all AI request execution in Wall-V.
 *
 * Every entry point (chat, voice, dashboard, API) calls this engine.
 * It performs: classify → resolve capabilities → resolve agents →
 * validate executability → validate provider → execute → return structured result.
 *
 * This replaces the fragmented execution paths that existed before.
 */

import connectToDatabase from "@/lib/mongodb";
import Agent from "@/models/agent";
import AgentConversation from "@/models/agent-conversation";
import AgentExecution from "@/models/agent-execution";
import {
  classifyRequest,
  resolveCapabilities,
  type ClassifiedRequest,
  type CapabilityDefinition,
} from "@/lib/capability-registry";
import {
  resolveAgents,
  type ResolvedAgent,
  type ResolutionResult,
} from "@/lib/agent-resolver";
import {
  getProviderAdapter,
  detectProvider,
  validateProviderConfig,
  type ProviderName,
} from "@/lib/ai-provider-adapter";

// ─── Types ──────────────────────────────────────────────────────────────────

export type ExecutionStatus =
  | "success"
  | "no_matching_agent"
  | "agent_not_executable"
  | "provider_unavailable"
  | "tool_unavailable"
  | "no_agent_capacity"
  | "classification_failed"
  | "execution_error"
  | "requirements_gathering";

export type ExecutabilityStatus = "executable" | "partially_executable" | "not_executable";

export interface ExecutionContext {
  userId?: string;
  userRole?: string;
  visitorId?: string;
  visitorName?: string;
  visitorEmail?: string;
  channel: "chat" | "voice" | "website" | "dashboard" | "api";
  conversationId?: string;
  projectId?: string;
  page?: string;
  isClientFacing?: boolean;
}

export interface ExecutionInput {
  message: string;
  context: ExecutionContext;
  conversationHistory?: { role: "user" | "assistant"; content: string }[];
  agentId?: string;
  maxAgents?: number;
}

export interface AgentExecutability {
  agentId: string;
  name: string;
  status: ExecutabilityStatus;
  reasons: string[];
  provider: ProviderName | null;
  modelValid: boolean;
  providerValid: boolean;
  toolsAvailable: boolean;
}

export interface ExecutionResult {
  success: boolean;
  status: ExecutionStatus;
  classified: ClassifiedRequest;
  capability: CapabilityDefinition | null;
  resolution: ResolutionResult | null;
  selectedAgent: ResolvedAgent | null;
  executability: AgentExecutability | null;
  provider: ProviderName | null;
  model: string | null;
  response: string;
  toolCalls: { name: string; args: unknown; result: unknown }[];
  conversationId: string;
  executionId: string | null;
  tokenUsage: { prompt: number; completion: number; total: number };
  cost: number;
  duration: number;
  errors: string[];
  requiresProject: boolean;
  requiresConfirmation: boolean;
}

// ─── Agent Executability Check ──────────────────────────────────────────────

export async function checkAgentExecutability(agentId: string): Promise<AgentExecutability> {
  const agent = await Agent.findById(agentId).lean();
  if (!agent) {
    return {
      agentId,
      name: "Unknown",
      status: "not_executable",
      reasons: ["Agent not found"],
      provider: null,
      modelValid: false,
      providerValid: false,
      toolsAvailable: false,
    };
  }

  const reasons: string[] = [];
  let modelValid = true;
  let providerValid = true;
  let toolsAvailable = true;

  // Check status
  if (agent.status !== "active") {
    reasons.push(`Agent status is '${agent.status}', not 'active'`);
  }

  // Check system prompt
  if (!agent.systemPrompt) {
    reasons.push("No system prompt configured");
  }

  // Check model
  const model = agent.aiModel || "gpt-4o";
  const provider = detectProvider(model);
  const providerCheck = validateProviderConfig(provider);
  if (!providerCheck.valid) {
    providerValid = false;
    reasons.push(`Provider '${provider}' unavailable: ${providerCheck.error}`);
  }

  // Check instructions exist
  if (!agent.instructions || agent.instructions.length === 0) {
    reasons.push("No instructions configured");
  }

  // Determine executability
  let status: ExecutabilityStatus = "executable";
  if (reasons.length > 0 && reasons.some((r) => r.includes("not 'active'") || r.includes("unavailable"))) {
    status = "not_executable";
  } else if (reasons.length > 0) {
    status = "partially_executable";
  }

  return {
    agentId: agent._id.toString(),
    name: agent.name,
    status,
    reasons,
    provider,
    modelValid,
    providerValid,
    toolsAvailable,
  };
}

// ─── Capacity Check ─────────────────────────────────────────────────────────

async function checkAgentCapacity(agentId: string, maxConcurrent = 10): Promise<{ available: boolean; activeTasks: number }> {
  const activeConversations = await AgentConversation.countDocuments({
    agent: agentId,
    status: "active",
  });

  return {
    available: activeConversations < maxConcurrent,
    activeTasks: activeConversations,
  };
}

// ─── Build System Prompt ────────────────────────────────────────────────────

function buildSystemPrompt(
  agent: { systemPrompt: string; instructions: string[]; name: string },
  capability: CapabilityDefinition | null,
  classified: ClassifiedRequest
): string {
  const parts: string[] = [];

  parts.push(`You are ${agent.name}, a specialized AI agent at Wall-V Digital Agency.`);
  parts.push("");

  if (agent.systemPrompt) {
    parts.push(agent.systemPrompt);
    parts.push("");
  }

  if (agent.instructions && agent.instructions.length > 0) {
    parts.push("## Instructions");
    agent.instructions.forEach((inst) => parts.push(`- ${inst}`));
    parts.push("");
  }

  if (capability) {
    parts.push("## Current Capability Context");
    parts.push(`Capability: ${capability.name}`);
    parts.push(`Description: ${capability.description}`);
    parts.push(`Category: ${capability.category}`);
    if (capability.requiredSkills.length > 0) {
      parts.push(`Required Skills: ${capability.requiredSkills.join(", ")}`);
    }
    parts.push("");
  }

  parts.push("## Request Classification");
  parts.push(`Type: ${classified.requestType}`);
  parts.push(`Complexity: ${classified.complexity}`);
  parts.push(`Confidence: ${Math.round(classified.confidence * 100)}%`);
  if (classified.requiresProject) {
    parts.push("This request requires a project to be created.");
  }
  parts.push("");

  parts.push("You have access to tools for querying and creating records in the system.");
  parts.push("Use tools when needed to fulfill the user's request.");
  parts.push("Always be helpful, professional, and accurate.");

  return parts.join("\n");
}

// ─── Fallback Keyword Matching ──────────────────────────────────────────────
// Used ONLY when capability-registry classification returns low confidence

async function fallbackKeywordMatch(message: string): Promise<ResolvedAgent | null> {
  const lower = message.toLowerCase();

  const query: Record<string, unknown> = { status: "active" };
  const agents = await Agent.find(query)
    .populate("skills", "name slug category")
    .populate("tools", "name slug category")
    .lean();

  if (agents.length === 0) return null;

  // Simple keyword scoring
  let bestAgent: (typeof agents)[0] | null = null;
  let bestScore = 0;

  for (const agent of agents) {
    let score = 0;
    const desc = (agent.description || "").toLowerCase();
    const words = lower.split(/\s+/);

    for (const word of words) {
      if (word.length > 3 && desc.includes(word)) score++;
    }

    if (agent.division && lower.includes(agent.division)) score += 3;
    if (agent.isMasterAgent) score += 2;
    if (agent.isClientFacing) score += 1;

    if (score > bestScore) {
      bestScore = score;
      bestAgent = agent;
    }
  }

  if (!bestAgent || bestScore < 2) return null;

  return {
    agentId: bestAgent._id.toString(),
    name: bestAgent.name,
    slug: bestAgent.slug,
    description: bestAgent.description || "",
    role: bestAgent.role || "custom",
    division: bestAgent.division || "",
    avatar: bestAgent.avatar || "🤖",
    score: bestScore,
    reasons: ["fallback keyword match"],
    skills: [],
    tools: [],
    capacity: 100,
    status: bestAgent.status,
  };
}

// ─── Main Execution Engine ──────────────────────────────────────────────────

export async function executeAIRequest(input: ExecutionInput): Promise<ExecutionResult> {
  const startTime = Date.now();
  const errors: string[] = [];

  try {
    await connectToDatabase();

    // ── Step 1: Classify the request ────────────────────────────────────
    const classified = classifyRequest(input.message);

    // ── Step 2: Resolve capabilities ────────────────────────────────────
    const capabilities = resolveCapabilities(classified);
    const primaryCapability = capabilities[0] || null;

    // ── Step 3: Resolve agents ──────────────────────────────────────────
    let resolution: ResolutionResult | null = null;

    if (input.agentId) {
      // Forced agent selection
      const executability = await checkAgentExecutability(input.agentId);
      if (executability.status === "not_executable") {
        return buildResult({
          success: false,
          status: "agent_not_executable",
          classified,
          capability: primaryCapability,
          resolution: null,
          selectedAgent: null,
          executability,
          response: `The selected agent is not executable: ${executability.reasons.join("; ")}`,
          errors: executability.reasons,
          startTime,
        });
      }

      const agent = await Agent.findById(input.agentId).lean();
      if (agent) {
        resolution = {
          success: true,
          primaryAgent: {
            agentId: agent._id.toString(),
            name: agent.name,
            slug: agent.slug,
            description: agent.description || "",
            role: agent.role || "custom",
            division: agent.division || "",
            avatar: agent.avatar || "🤖",
            score: 100,
            reasons: ["explicitly selected"],
            skills: [],
            tools: [],
            capacity: 100,
            status: agent.status,
          },
          supportingAgents: [],
          totalQualified: 1,
          requestType: classified.requestType,
          capabilityId: primaryCapability?.id || "",
          requiresAuth: primaryCapability?.requiresAuth ?? false,
          requiresProject: primaryCapability?.requiresProject ?? false,
          estimatedDuration: primaryCapability?.estimatedDuration || "Unknown",
        };
      }
    } else if (primaryCapability) {
      resolution = await resolveAgents(classified, primaryCapability, input.context.userRole, [], input.maxAgents || 5);
    }

    // ── Step 4: Fallback if no agent resolved ───────────────────────────
    if (!resolution?.primaryAgent) {
      const fallback = await fallbackKeywordMatch(input.message);
      if (fallback) {
        resolution = {
          success: true,
          primaryAgent: fallback,
          supportingAgents: [],
          totalQualified: 1,
          requestType: classified.requestType,
          capabilityId: primaryCapability?.id || "",
          requiresAuth: primaryCapability?.requiresAuth ?? false,
          requiresProject: primaryCapability?.requiresProject ?? false,
          estimatedDuration: primaryCapability?.estimatedDuration || "Unknown",
        };
      }
    }

    if (!resolution?.primaryAgent) {
      return buildResult({
        success: false,
        status: "no_matching_agent",
        classified,
        capability: primaryCapability,
        resolution,
        selectedAgent: null,
        executability: null,
        response: primaryCapability
          ? `I understand you need help with ${primaryCapability.name}. Unfortunately, no qualified agent is available right now. Our team will get back to you shortly.`
          : "I'd be happy to help! Could you tell me more about what you need so I can connect you with the right specialist?",
        errors: ["No matching agent found"],
        startTime,
      });
    }

    // ── Step 5: Check executability ─────────────────────────────────────
    const executability = await checkAgentExecutability(resolution.primaryAgent.agentId);

    if (executability.status === "not_executable") {
      // Try next supporting agent
      for (const supporting of resolution.supportingAgents) {
        const altExec = await checkAgentExecutability(supporting.agentId);
        if (altExec.status !== "not_executable") {
          resolution.primaryAgent = supporting;
          Object.assign(executability, altExec);
          break;
        }
      }

      if (executability.status === "not_executable") {
        return buildResult({
          success: false,
          status: "agent_not_executable",
          classified,
          capability: primaryCapability,
          resolution,
          selectedAgent: resolution.primaryAgent,
          executability,
          response: "No executable agent is available for this request. Please try again later or contact our team directly.",
          errors: executability.reasons,
          startTime,
        });
      }
    }

    // ── Step 6: Validate provider ───────────────────────────────────────
    const agent = await Agent.findById(resolution.primaryAgent.agentId);
    if (!agent) {
      return buildResult({
        success: false,
        status: "agent_not_executable",
        classified,
        capability: primaryCapability,
        resolution,
        selectedAgent: resolution.primaryAgent,
        executability,
        response: "Agent data could not be loaded. Please try again.",
        errors: ["Agent not found in database"],
        startTime,
      });
    }

    const model = agent.aiModel || "gpt-4o";
    const provider = detectProvider(model);
    const providerCheck = validateProviderConfig(provider);

    if (!providerCheck.valid) {
      return buildResult({
        success: false,
        status: "provider_unavailable",
        classified,
        capability: primaryCapability,
        resolution,
        selectedAgent: resolution.primaryAgent,
        executability,
        provider,
        model,
        response: "The AI provider for this agent is currently unavailable. Please try again later.",
        errors: [providerCheck.error || "Provider unavailable"],
        startTime,
      });
    }

    // ── Step 7: Check capacity ──────────────────────────────────────────
    const capacity = await checkAgentCapacity(agent._id.toString());
    if (!capacity.available) {
      // Try next supporting agent
      let foundAlt = false;
      for (const supporting of resolution.supportingAgents) {
        const altCapacity = await checkAgentCapacity(supporting.agentId);
        if (altCapacity.available) {
          const altAgent = await Agent.findById(supporting.agentId);
          if (altAgent) {
            resolution.primaryAgent = supporting;
            Object.assign(agent, altAgent);
            foundAlt = true;
            break;
          }
        }
      }

      if (!foundAlt) {
        return buildResult({
          success: false,
          status: "no_agent_capacity",
          classified,
          capability: primaryCapability,
          resolution,
          selectedAgent: resolution.primaryAgent,
          executability,
          provider,
          model,
          response: "All our specialists are currently busy. Please try again in a few minutes or leave your request and we'll get back to you.",
          errors: [`All agents at capacity (${capacity.activeTasks} active tasks)`],
          startTime,
        });
      }
    }

    // ── Step 8: Build system prompt and execute ─────────────────────────
    const systemPrompt = buildSystemPrompt(
      { systemPrompt: agent.systemPrompt, instructions: agent.instructions || [], name: agent.name },
      primaryCapability,
      classified
    );

    const messages = [
      ...(input.conversationHistory || []).slice(-10).map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      })),
      { role: "user" as const, content: input.message },
    ];

    const adapter = getProviderAdapter(model);
    const providerResult = await adapter.chat({
      model,
      messages: [
        { role: "system", content: systemPrompt },
        ...messages,
      ],
      temperature: agent.temperature || 0.7,
      maxTokens: agent.maxTokens || 2048,
    });

    const response = providerResult.content || "I processed your request but have no text response to return.";
    const duration = Date.now() - startTime;

    // ── Step 9: Save conversation and execution ─────────────────────────
    let conversationId = input.context.conversationId || "";
    let conversation;

    if (conversationId) {
      conversation = await AgentConversation.findById(conversationId);
    }

    if (!conversation) {
      conversation = await AgentConversation.create({
        agent: agent._id,
        sessionId: input.context.conversationId || `exec-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
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
            executionEngine: true,
          },
        },
        messages: [],
        requestedBy: input.context.userId || null,
      });
      conversationId = conversation._id.toString();
    }

    // Add messages to conversation
    conversation.messages.push(
      { role: "user", content: input.message, timestamp: new Date() },
      { role: "assistant", content: response, timestamp: new Date() }
    );
    await conversation.save();

    // Create execution log
    const execution = await AgentExecution.create({
      agent: agent._id,
      conversation: conversation._id,
      type: "chat",
      status: "completed",
      requestedBy: input.context.userId || null,
      input: { message: input.message, classified: classified.requestType, capability: primaryCapability?.id },
      output: { response },
      tokens: providerResult.usage,
      cost: 0,
      duration,
      startedAt: new Date(startTime),
      completedAt: new Date(),
    });

    // Update agent stats
    await Agent.findByIdAndUpdate(agent._id, {
      $inc: {
        "stats.totalConversations": 1,
        "stats.totalMessages": 1,
        "stats.totalExecutions": 1,
        "stats.successfulExecutions": 1,
      },
      $set: { "stats.lastActive": new Date() },
    });

    return buildResult({
      success: true,
      status: "success",
      classified,
      capability: primaryCapability,
      resolution,
      selectedAgent: resolution.primaryAgent,
      executability,
      provider,
      model,
      response,
      toolCalls: [],
      conversationId,
      executionId: execution._id.toString(),
      tokenUsage: providerResult.usage,
      duration,
      errors: [],
      requiresProject: primaryCapability?.requiresProject ?? false,
      startTime,
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Execution failed";
    const duration = Date.now() - startTime;
    console.error("[AI Execution Engine] Error:", msg);

    return buildResult({
      success: false,
      status: "execution_error",
      classified: classifyRequest(input.message),
      capability: null,
      resolution: null,
      selectedAgent: null,
      executability: null,
      response: "I'm sorry, something went wrong processing your request. Please try again.",
      errors: [msg],
      duration,
      startTime,
    });
  }
}

// ─── Result Builder ─────────────────────────────────────────────────────────

function buildResult(params: {
  success: boolean;
  status: ExecutionStatus;
  classified: ClassifiedRequest;
  capability: CapabilityDefinition | null;
  resolution: ResolutionResult | null;
  selectedAgent: ResolvedAgent | null;
  executability: AgentExecutability | null;
  provider?: ProviderName | null;
  model?: string | null;
  response: string;
  toolCalls?: { name: string; args: unknown; result: unknown }[];
  conversationId?: string;
  executionId?: string | null;
  tokenUsage?: { prompt: number; completion: number; total: number };
  cost?: number;
  duration?: number;
  errors: string[];
  requiresProject?: boolean;
  requiresConfirmation?: boolean;
  startTime: number;
}): ExecutionResult {
  return {
    success: params.success,
    status: params.status,
    classified: params.classified,
    capability: params.capability,
    resolution: params.resolution,
    selectedAgent: params.selectedAgent,
    executability: params.executability,
    provider: params.provider ?? null,
    model: params.model ?? null,
    response: params.response,
    toolCalls: params.toolCalls ?? [],
    conversationId: params.conversationId ?? "",
    executionId: params.executionId ?? null,
    tokenUsage: params.tokenUsage ?? { prompt: 0, completion: 0, total: 0 },
    cost: params.cost ?? 0,
    duration: params.duration ?? (Date.now() - params.startTime),
    errors: params.errors,
    requiresProject: params.requiresProject ?? false,
    requiresConfirmation: params.requiresConfirmation ?? false,
  };
}
