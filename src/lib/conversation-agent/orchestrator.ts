/**
 * Conversation Orchestrator — the brain of the conversation agent.
 *
 * Pipeline: conversation → structured extraction → action plan → tool execution → verified result → response
 *
 * This is NOT just "send to LLM and hope it calls tools".
 * This is a deterministic pipeline that:
 * 1. Extracts structured data from each message
 * 2. Determines what actions are needed
 * 3. Executes actions in dependency order
 * 4. Verifies every result before claiming success
 * 5. Builds the LLM prompt with structured context + tool results
 * 6. Gets the final conversational response from the LLM
 */

import connectToDatabase from "@/lib/mongodb";
import Agent from "@/models/agent";
import AgentConversation from "@/models/agent-conversation";
import AgentExecution from "@/models/agent-execution";
import { classifyRequest, resolveCapabilities } from "@/lib/capability-registry";
import { detectProvider, validateProviderConfig, getProviderAdapter } from "@/lib/ai-provider-adapter";
import { captureMemoriesFromMessage } from "@/lib/agent-memory";
import type { VisitorState, ToolResult, OrchestrationResult } from "./types";
import { createVisitorState } from "./types";
import { extractFromMessage, determineRequiredActions } from "./state-manager";
import { getOpenAITools } from "./tool-registry";
import { executeConversationTool } from "./tool-executor";

// ─── Logging ────────────────────────────────────────────────────────────────

function log(category: string, message: string, data?: Record<string, unknown>) {
  const entry = `[ConvAgent][${category}] ${message}`;
  if (data) {
    console.log(entry, JSON.stringify(data).slice(0, 500));
  } else {
    console.log(entry);
  }
}

// ─── System Prompt Builder ──────────────────────────────────────────────────

function buildSystemPrompt(
  agent: { name: string; systemPrompt: string; instructions: string[] },
  state: VisitorState,
  toolResults: ToolResult[],
  capability: { name: string; description: string } | null,
  requestType: string
): string {
  const parts: string[] = [];

  parts.push(`You are ${agent.name}, an AI assistant at Wall-V Digital Agency.`);
  parts.push("");

  if (agent.systemPrompt) {
    parts.push(agent.systemPrompt);
    parts.push("");
  }

  // Structured state (what we know so far)
  parts.push("## What You Know About This Visitor");
  parts.push(formatStateForPrompt(state));
  parts.push("");

  // Tool results (what actions were taken)
  if (toolResults.length > 0) {
    parts.push("## Actions Taken");
    for (const result of toolResults) {
      if (result.success) {
        parts.push(`- ${result.toolName}: Success — ${JSON.stringify(result.data).slice(0, 200)}`);
      } else {
        parts.push(`- ${result.toolName}: Failed — ${result.error}`);
      }
    }
    parts.push("");
  }

  // Capability context
  if (capability) {
    parts.push("## Service Context");
    parts.push(`The visitor appears to need: ${capability.name}`);
    parts.push(`${capability.description}`);
    parts.push("");
  }

  // Instructions
  if (agent.instructions && agent.instructions.length > 0) {
    parts.push("## Rules");
    agent.instructions.forEach((inst) => parts.push(`- ${inst}`));
    parts.push("");
  }

  parts.push("## Critical Rules");
  parts.push("- NEVER claim an action succeeded unless the tool result above confirms it.");
  parts.push("- NEVER fabricate IDs, confirmation numbers, or account details.");
  parts.push("- If a tool failed, explain what went wrong and ask for clarification.");
  parts.push("- If you need information that hasn't been collected yet, ask for it.");
  parts.push("- Keep responses concise and professional.");
  parts.push("- Use the visitor's name if you know it.");
  parts.push("");

  // Missing fields guidance
  if (state.missingRequiredFields.length > 0) {
    parts.push("## Missing Information");
    parts.push(`You still need: ${state.missingRequiredFields.join(", ")}`);
    parts.push("Ask the visitor for this information naturally — don't list fields.");
    parts.push("");
  }

  return parts.join("\n");
}

function formatStateForPrompt(state: VisitorState): string {
  const lines: string[] = [];
  if (state.name) lines.push(`- Name: ${state.name}`);
  if (state.email) lines.push(`- Email: ${state.email}`);
  if (state.phone) lines.push(`- Phone: ${state.phone}`);
  if (state.company) lines.push(`- Company: ${state.company}`);
  if (state.intent) lines.push(`- Intent: ${state.intent}`);
  if (state.projectType) lines.push(`- Project type: ${state.projectType}`);
  if (state.objective) lines.push(`- Objective: ${state.objective}`);
  if (state.features.length > 0) lines.push(`- Features: ${state.features.join(", ")}`);
  if (state.budget) lines.push(`- Budget: ${state.budget}`);
  if (state.timeline) lines.push(`- Timeline: ${state.timeline}`);
  if (state.industry) lines.push(`- Industry: ${state.industry}`);
  if (state.targetAudience) lines.push(`- Target audience: ${state.targetAudience}`);
  if (state.userId) lines.push(`- User ID: ${state.userId}`);
  if (state.clientId) lines.push(`- Client ID: ${state.clientId}`);
  if (state.projectRequestId) lines.push(`- Project Request ID: ${state.projectRequestId}`);
  if (lines.length === 0) lines.push("- No information collected yet");
  return lines.join("\n");
}

// ─── Main Orchestration ─────────────────────────────────────────────────────

export async function orchestrateConversation(params: {
  message: string;
  conversationId?: string;
  visitorState?: VisitorState;
  channel: "chat" | "voice" | "website" | "dashboard";
  agentId?: string;
  userId?: string;
  page?: string;
}): Promise<OrchestrationResult> {
  const startTime = Date.now();
  const toolCallsMade: ToolResult[] = [];

  await connectToDatabase();

  // ── Step 1: Load or create visitor state ───────────────────────────
  let state = params.visitorState || createVisitorState({ source: params.channel });

  // ── Step 2: Extract structured data from message ───────────────────
  const previousState = { ...state };
  state = extractFromMessage(params.message, state);

  log("extract", "Extracted from message", {
    newFields: findNewFields(previousState, state),
    missingFields: state.missingRequiredFields,
  });

  // ── Step 3: Classify the request ───────────────────────────────────
  const classified = classifyRequest(params.message);
  const capabilities = resolveCapabilities(classified);
  const primaryCapability = capabilities[0] || null;

  // ── Step 4: Determine required actions ─────────────────────────────
  const requiredActions = determineRequiredActions(state);

  log("plan", "Required actions", { actions: requiredActions });

  // ── Step 5: Execute tools in dependency order ──────────────────────
  for (const action of requiredActions) {
    const toolResult = await executeAction(action, state, params);
    toolCallsMade.push(toolResult);

    // Update state with tool results
    state = applyToolResult(state, action, toolResult);

    log("execute", `Tool: ${action}`, {
      success: toolResult.success,
      data: toolResult.data ? Object.keys(toolResult.data) : null,
      error: toolResult.error,
    });
  }

  // ── Step 6: Load agent ─────────────────────────────────────────────
  let agent;
  if (params.agentId) {
    agent = await Agent.findById(params.agentId);
  } else {
    agent = await Agent.findOne({ status: "active", isMasterAgent: true });
    if (!agent) {
      agent = await Agent.findOne({ status: "active", isClientFacing: true });
    }
    if (!agent) {
      agent = await Agent.findOne({ status: "active" });
    }
  }

  if (!agent) {
    return {
      response: "I'm sorry, no agents are available right now. Please try again later.",
      visitorState: state,
      toolCallsMade,
      requiresProject: false,
      requiresConfirmation: false,
      conversationId: params.conversationId || "",
      executionId: null,
      duration: Date.now() - startTime,
    };
  }

  // ── Step 7: Validate provider ──────────────────────────────────────
  const model = agent.aiModel || "gpt-4o";
  const provider = detectProvider(model);
  const providerCheck = validateProviderConfig(provider);

  if (!providerCheck.valid) {
    return {
      response: "I'm sorry, our AI system is temporarily unavailable. Please try again shortly.",
      visitorState: state,
      toolCallsMade,
      requiresProject: false,
      requiresConfirmation: false,
      conversationId: params.conversationId || "",
      executionId: null,
      duration: Date.now() - startTime,
    };
  }

  // ── Step 8: Build prompt and get LLM response ─────────────────────
  const systemPrompt = buildSystemPrompt(
    { name: agent.name, systemPrompt: agent.systemPrompt || "", instructions: agent.instructions || [] },
    state,
    toolCallsMade,
    primaryCapability,
    classified.requestType
  );

  // Load conversation history
  let conversationHistory: { role: "user" | "assistant" | "tool"; content: string; tool_call_id?: string; tool_calls?: unknown[] }[] = [];
  if (params.conversationId) {
    const conversation = await AgentConversation.findById(params.conversationId);
    if (conversation) {
      conversationHistory = conversation.messages.slice(-10).map(
        (m: { role: string; content: string }) => ({
          role: m.role as "user" | "assistant",
          content: m.content,
        })
      );
    }
  }

  const messages: { role: "user" | "assistant" | "system" | "tool"; content: string; tool_call_id?: string; tool_calls?: unknown[] }[] = [
    { role: "system" as const, content: systemPrompt },
    ...conversationHistory,
    { role: "user" as const, content: params.message },
  ];

  const adapter = getProviderAdapter(model);
  const tools = getOpenAITools();

  let responseText: string;
  try {
    const result = await adapter.chat({
      model,
      messages,
      tools,
      temperature: agent.temperature || 0.7,
      maxTokens: agent.maxTokens || 2048,
    });

    // Handle tool calls in a loop (max 3 iterations)
    responseText = result.content || "";
    let toolIterations = 0;
    const MAX_TOOL_ITERATIONS = 3;

    if (result.toolCalls.length > 0 && toolIterations < MAX_TOOL_ITERATIONS) {
      let currentMessages = [...messages, {
        role: "assistant" as const,
        content: result.content || "",
        tool_calls: result.toolCalls.map((tc) => ({
          id: tc.id,
          type: "function" as const,
          function: { name: tc.name, arguments: tc.arguments },
        })),
      }];

      for (const toolCall of result.toolCalls) {
        let args: Record<string, unknown> = {};
        try {
          args = JSON.parse(toolCall.arguments);
        } catch {
          // malformed args
        }

        const toolResult = await executeConversationTool(toolCall.name, args);
        toolCallsMade.push(toolResult);
        state = applyToolResult(state, toolCall.name, toolResult);

        currentMessages.push({
          role: "tool" as const,
          content: JSON.stringify(toolResult),
          tool_call_id: toolCall.id,
        });
      }

      toolIterations++;

      // Get follow-up response with tool results
      const followUp = await adapter.chat({
        model,
        messages: currentMessages,
        tools,
        temperature: agent.temperature || 0.7,
        maxTokens: agent.maxTokens || 2048,
      });

      responseText = followUp.content || responseText;

      // Handle additional tool calls
      if (followUp.toolCalls.length > 0 && toolIterations < MAX_TOOL_ITERATIONS) {
        for (const tc of followUp.toolCalls) {
          let a: Record<string, unknown> = {};
          try { a = JSON.parse(tc.arguments); } catch { /* */ }
          const tr = await executeConversationTool(tc.name, a);
          toolCallsMade.push(tr);
          state = applyToolResult(state, tc.name, tr);
        }
        toolIterations++;
      }
    }
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "LLM call failed";
    log("error", "LLM execution failed", { error: msg });
    responseText = "I'm having trouble processing your request. Could you please try again?";
  }

  // ── Step 9: Save conversation ──────────────────────────────────────
  let conversationId = params.conversationId || "";

  try {
    let conversation;
    if (conversationId) {
      conversation = await AgentConversation.findById(conversationId);
    }

    if (!conversation) {
      conversation = await AgentConversation.create({
        agent: agent._id,
        sessionId: conversationId || `conv-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        channel: params.channel,
        status: "active",
        visitor: {
          id: params.userId || "anonymous",
          name: state.name || "Anonymous",
          email: state.email || "",
        },
        context: {
          page: params.page || "",
          language: state.language,
          metadata: {
            requestType: classified.requestType,
            capabilityId: primaryCapability?.id,
            orchestratorVersion: "2.0",
          },
        },
        messages: [],
        requestedBy: params.userId || null,
      });
      conversationId = conversation._id.toString();
    }

    conversation.messages.push(
      { role: "user", content: params.message, timestamp: new Date() },
      { role: "assistant", content: responseText, timestamp: new Date() }
    );
    await conversation.save();

    // Save memories (non-blocking)
    captureMemoriesFromMessage(
      agent._id.toString(),
      params.message,
      conversationId,
      conversation.sessionId
    ).catch(() => {});

    // Create execution log
    const execution = await AgentExecution.create({
      agent: agent._id,
      conversation: conversation._id,
      type: "chat",
      status: "completed",
      requestedBy: params.userId || null,
      input: {
        message: params.message,
        classified: classified.requestType,
        capability: primaryCapability?.id,
        structuredState: {
          name: state.name,
          email: state.email,
          projectType: state.projectType,
        },
      },
      output: {
        response: responseText,
        toolCalls: toolCallsMade.map((t) => ({
          tool: t.toolName,
          success: t.success,
          data: t.data,
        })),
      },
      tokens: { prompt: 0, completion: 0, total: 0 },
      cost: 0,
      duration: Date.now() - startTime,
      startedAt: new Date(startTime),
      completedAt: new Date(),
    });

    // Update agent stats
    await Agent.findByIdAndUpdate(agent._id, {
      $inc: { "stats.totalConversations": 1, "stats.totalMessages": 1 },
      $set: { "stats.lastActive": new Date() },
    });

    return {
      response: responseText,
      visitorState: state,
      toolCallsMade,
      requiresProject: classified.requiresProject,
      requiresConfirmation: state.missingRequiredFields.length > 0,
      conversationId,
      executionId: execution._id.toString(),
      duration: Date.now() - startTime,
    };
  } catch (error: unknown) {
    log("error", "Failed to save conversation", { error: String(error) });
    return {
      response: responseText,
      visitorState: state,
      toolCallsMade,
      requiresProject: classified.requiresProject,
      requiresConfirmation: false,
      conversationId,
      executionId: null,
      duration: Date.now() - startTime,
    };
  }
}

// ─── Action Executor ────────────────────────────────────────────────────────

async function executeAction(
  action: string,
  state: VisitorState,
  params: { channel: string; userId?: string }
): Promise<ToolResult> {
  switch (action) {
    case "lookup_user": {
      const args: Record<string, string> = {};
      if (state.email) args.email = state.email;
      if (state.phone) args.phone = state.phone;
      return executeConversationTool("lookup_user", args);
    }
    case "create_user": {
      // Only create if lookup didn't find one
      if (state.userId) {
        return { success: true, toolName: "create_user", data: { alreadyExists: true, userId: state.userId }, error: null, errorCode: null };
      }
      return executeConversationTool("create_user", {
        name: state.name || "",
        email: state.email || "",
        phone: state.phone || "",
        company: state.company || "",
        source: params.channel,
      });
    }
    case "lookup_client": {
      const args: Record<string, string> = {};
      if (state.email) args.email = state.email;
      if (state.phone) args.phone = state.phone;
      return executeConversationTool("lookup_client", args);
    }
    case "create_client": {
      if (state.clientId) {
        return { success: true, toolName: "create_client", data: { alreadyExists: true, clientId: state.clientId }, error: null, errorCode: null };
      }
      return executeConversationTool("create_client", {
        name: state.name || "",
        email: state.email || "",
        phone: state.phone || "",
        company: state.company || "",
        source: params.channel,
        userId: state.userId || "",
      });
    }
    case "create_project_request": {
      if (state.projectRequestId) {
        return { success: true, toolName: "create_project_request", data: { alreadyExists: true, projectRequestId: state.projectRequestId }, error: null, errorCode: null };
      }
      return executeConversationTool("create_project_request", {
        clientName: state.name || "",
        clientEmail: state.email || "",
        clientPhone: state.phone || "",
        clientCompany: state.company || "",
        projectType: state.projectType || "",
        objective: state.objective || "",
        features: state.features.join(", "),
        budget: state.budget || "",
        timeline: state.timeline || "",
        industry: state.industry || "",
        targetAudience: state.targetAudience || "",
        designStyle: state.designStyle || "",
        integrations: state.integrations.join(", "),
      });
    }
    default:
      return { success: false, toolName: action, data: null, error: `Unknown action: ${action}`, errorCode: "UNKNOWN_ACTION" };
  }
}

// ─── State Update from Tool Results ─────────────────────────────────────────

function applyToolResult(state: VisitorState, action: string, result: ToolResult): VisitorState {
  if (!result.success || !result.data) return state;

  const updated = { ...state };

  switch (action) {
    case "lookup_user":
      if (result.data.found && result.data.userId) {
        updated.userId = result.data.userId as string;
      }
      break;
    case "create_user":
      if (result.data.created && result.data.userId) {
        updated.userId = result.data.userId as string;
      } else if (result.data.existed && result.data.userId) {
        updated.userId = result.data.userId as string;
      }
      break;
    case "lookup_client":
      if (result.data.found && result.data.clientId) {
        updated.clientId = result.data.clientId as string;
      }
      break;
    case "create_client":
      if (result.data.created && result.data.clientId) {
        updated.clientId = result.data.clientId as string;
      } else if (result.data.existed && result.data.clientId) {
        updated.clientId = result.data.clientId as string;
      }
      break;
    case "create_project_request":
      if (result.data.created && result.data.projectRequestId) {
        updated.projectRequestId = result.data.projectRequestId as string;
      }
      break;
  }

  return updated;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function findNewFields(previous: VisitorState, current: VisitorState): string[] {
  const newFields: string[] = [];
  const fields = ["name", "email", "phone", "company", "projectType", "objective", "budget", "timeline", "industry", "targetAudience"] as const;
  for (const field of fields) {
    if (!previous[field] && current[field]) {
      newFields.push(field);
    }
  }
  if (previous.features.length < current.features.length) {
    newFields.push("features");
  }
  return newFields;
}
