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

  // ── Conversation mode (the most important section) ──────────────
  parts.push("## How to Talk");
  parts.push("");
  parts.push("You are having a natural conversation, NOT running a menu system.");
  parts.push("");
  parts.push("NEVER do these things:");
  parts.push("- NEVER present numbered lists of services or options for the user to pick from.");
  parts.push("- NEVER say \"Choose one of these options\" or \"Select from the following\".");
  parts.push("- NEVER repeat the same options or service list in consecutive messages.");
  parts.push("- NEVER ask for information you already know (check the Known fields below).");
  parts.push("- NEVER ask for more than one piece of information at a time.");
  parts.push("");
  parts.push("ALWAYS do these things:");
  parts.push("- Respond to what the user actually said. Address their specific message.");
  parts.push("- Ask at most ONE question per message — weave it naturally into your reply.");
  parts.push("- If the user provided their name, email, or phone, acknowledge it briefly and move on.");
  parts.push("- Use the visitor's name occasionally (not every sentence).");
  parts.push("- Keep responses short (2-4 sentences max unless explaining something).");
  parts.push("- Sound like a helpful human, not a form. No bullet-point lists of options.");
  parts.push("");

  // ── Known state ─────────────────────────────────────────────────
  parts.push("## What You Know");
  parts.push(formatStateForPrompt(state));
  parts.push("");

  // ── Next action (exactly what to do now) ────────────────────────
  parts.push("## What To Do Now");
  parts.push(getNextActionGuidance(state, capability));
  parts.push("");

  // ── Tool results (what actions were taken) ──────────────────────
  if (toolResults.length > 0) {
    parts.push("## Actions Taken");
    for (const result of toolResults) {
      if (result.success) {
        parts.push(`- ${result.toolName}: Success`);
      } else {
        parts.push(`- ${result.toolName}: Failed — ${result.error}`);
      }
    }
    parts.push("");
  }

  // ── Capability context ──────────────────────────────────────────
  if (capability) {
    parts.push("## Detected Service Need");
    parts.push(`${capability.name}: ${capability.description}`);
    parts.push("");
  }

  // ── Agent instructions ──────────────────────────────────────────
  if (agent.instructions && agent.instructions.length > 0) {
    parts.push("## Rules");
    agent.instructions.forEach((inst) => parts.push(`- ${inst}`));
    parts.push("");
  }

  // ── Hard rules ──────────────────────────────────────────────────
  parts.push("## Hard Rules");
  parts.push("- NEVER claim an action succeeded unless the tool result above confirms it.");
  parts.push("- NEVER fabricate IDs, confirmation numbers, or account details.");
  parts.push("- NEVER present a menu, numbered list, or \"option 1 / option 2\" choices.");
  parts.push("- If a tool failed, say what went wrong and ask how to proceed.");
  parts.push("- After tools create or update a record, tell the user they can see it in their dashboard.");
  parts.push("");

  return parts.join("\n");
}

function formatStateForPrompt(state: VisitorState): string {
  const lines: string[] = [];

  const known: string[] = [];
  if (state.name) known.push(`Name: ${state.name}`);
  if (state.email) known.push(`Email: ${state.email}`);
  if (state.phone) known.push(`Phone: ${state.phone}`);
  if (state.company) known.push(`Company: ${state.company}`);

  if (known.length > 0) {
    lines.push(`Identity: ${known.join(" | ")}`);
  } else {
    lines.push("Identity: Not yet collected");
  }

  if (state.intent) lines.push(`Intent: ${state.intent}`);
  if (state.projectType) lines.push(`Service: ${state.projectType}`);
  if (state.objective) lines.push(`Goal: ${state.objective}`);
  if (state.features.length > 0) lines.push(`Requirements: ${state.features.join(", ")}`);
  if (state.budget) lines.push(`Budget: ${state.budget}`);
  if (state.timeline) lines.push(`Timeline: ${state.timeline}`);
  if (state.industry) lines.push(`Industry: ${state.industry}`);
  if (state.targetAudience) lines.push(`Audience: ${state.targetAudience}`);

  if (state.userId) lines.push(`(User ID: ${state.userId})`);
  if (state.clientId) lines.push(`(Client ID: ${state.clientId})`);
  if (state.projectRequestId) lines.push(`(Project Request: ${state.projectRequestId})`);
  if (state.inquiryId) lines.push(`(Inquiry: ${state.inquiryId})`);

  if (lines.length === 0) lines.push("No information collected yet — start by greeting the visitor.");

  return lines.join("\n");
}

/**
 * Returns guidance about exactly what the agent should do on this turn.
 * This is the key mechanism that prevents repeated questions and menus.
 */
function getNextActionGuidance(
  state: VisitorState,
  capability: { name: string; description: string } | null
): string {
  const missing = state.missingRequiredFields;
  const hasIdentity = !!(state.name || state.email || state.phone);
  const hasService = !!(state.intent || state.projectType);

  // First turn — greet
  if (state.turnCount <= 1 && !hasIdentity) {
    return "This is the start of the conversation. Greet the visitor briefly, ask how you can help. Do NOT present options or a menu.";
  }

  // User just provided info — acknowledge and continue
  if (hasIdentity && hasService && missing.length > 0) {
    return `The visitor has shared what they need. You still need their ${missing[0]} — ask for it naturally in context, not as an isolated question.`;
  }

  // We have service but missing identity
  if (hasService && !hasIdentity && missing.length > 0) {
    return `The visitor wants: ${state.intent || state.projectType}. You need their ${missing[0]} — ask for it naturally while acknowledging their request.`;
  }

  // Missing requirements details — ask about their project
  if (hasService && hasIdentity && missing.length > 0) {
    return `You have their identity and service need. Ask about ${missing[0]} to fill in project details. Ask open-ended questions about their needs, not yes/no.`;
  }

  // Everything collected — continue natural conversation
  if (missing.length === 0) {
    if (state.features.length > 0) {
      return "All key information collected. Ask follow-up questions about their requirements if needed, or confirm what you have captured. Mention they can see details in their dashboard.";
    }
    return "All key information collected. Ask open-ended questions about their project needs, goals, or timeline. Continue the conversation naturally.";
  }

  // Default — ask for the first missing field
  return `Ask for the visitor's ${missing[0]} naturally, woven into your response to what they just said.`;
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
    case "create_inquiry": {
      // Don't create duplicate inquiries if we already have one
      if (state.inquiryId) {
        return { success: true, toolName: "create_inquiry", data: { alreadyExists: true, inquiryId: state.inquiryId }, error: null, errorCode: null };
      }
      const requirements = state.features.length > 0
        ? state.features.join(", ")
        : state.objective || "General inquiry";
      return executeConversationTool("create_inquiry", {
        name: state.name || "",
        email: state.email || "",
        phone: state.phone || "",
        company: state.company || "",
        subject: `${state.projectType || state.intent || "Project"} Inquiry`,
        message: `Service: ${state.projectType || state.intent || "Unknown"}\n\nGoal: ${state.objective || "Not specified"}\n\nRequirements: ${requirements}${state.budget ? `\n\nBudget: ${state.budget}` : ""}${state.timeline ? `\n\nTimeline: ${state.timeline}` : ""}${state.industry ? `\n\nIndustry: ${state.industry}` : ""}${state.targetAudience ? `\n\nTarget Audience: ${state.targetAudience}` : ""}`,
        type: "sales",
        source: params.channel === "voice" ? "voice" : "chat",
        estimatedBudget: state.budget || undefined,
        estimatedTimeline: state.timeline || undefined,
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
    case "create_inquiry":
      if (result.data.inquiryId) {
        updated.inquiryId = result.data.inquiryId as string;
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
