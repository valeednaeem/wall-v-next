/**
 * Agent Orchestrator — Multi-agent workflow execution engine.
 *
 * Handles:
 * 1. Request → Agent matching
 * 2. Single agent execution with tool calling
 * 3. Multi-step workflow execution
 * 4. Agent-to-agent delegation
 * 5. Progress tracking and result aggregation
 */

import { connectToDatabase } from "@/lib/mongodb";
import Agent from "@/models/agent";
import AgentWorkflow from "@/models/agent-workflow";
import AgentExecution from "@/models/agent-execution";
import { matchAgents, MatchInput } from "@/lib/agent-matching";

// ─── Types ─────────────────────────────────────────────────────────────────

export interface OrchestrationRequest {
  message: string;
  context?: string;
  resourceType?: string;
  resourceId?: string;
  userId?: string;
  userRole?: string;
  channel?: string;
  workflowId?: string;      // Force a specific workflow
  agentId?: string;         // Force a specific agent
  maxAgents?: number;       // Max agents to involve (default: 3)
  maxIterations?: number;   // Max tool-calling iterations per agent (default: 5)
  timeout?: number;         // Total timeout in ms (default: 120000)
}

export interface OrchestrationResult {
  success: boolean;
  response: string;
  agentsUsed: { id: string; name: string; role: string }[];
  toolCalls: { tool: string; args: Record<string, unknown>; result: unknown }[];
  steps: StepResult[];
  duration: number;
  tokenUsage?: { prompt: number; completion: number; total: number };
  cost?: number;
  error?: string;
}

export interface StepResult {
  step: number;
  agentId: string;
  agentName: string;
  action: string;
  status: "completed" | "failed" | "skipped" | "delegated";
  result: string;
  duration: number;
  error?: string;
}

// ─── Main Orchestrator ─────────────────────────────────────────────────────

export async function orchestrate(request: OrchestrationRequest): Promise<OrchestrationResult> {
  const startTime = Date.now();
  const {
    message,
    context = "system",
    resourceType,
    resourceId,
    userId,
    userRole = "customer",
    channel = "dashboard",
    workflowId,
    agentId,
    maxAgents = 3,
    maxIterations = 5,
    timeout = 120000,
  } = request;

  await connectToDatabase();

  // If a specific workflow is requested, run it
  if (workflowId) {
    return executeWorkflow(workflowId, message, { userId, userRole, context, resourceType, resourceId }, timeout);
  }

  // 1. Match agents to the request
  const matchInput: MatchInput = {
    requirement: message,
    context: (context as "visitor" | "lead" | "customer" | "client" | "admin" | "staff" | "system") || "system",
    channel: (channel as "website" | "whatsapp" | "email" | "api" | "dashboard" | "voice") || "dashboard",
    limit: maxAgents,
  };

  const matches = await matchAgents(matchInput);

  if (matches.length === 0) {
    return {
      success: false,
      response: "No suitable agent found for this request.",
      agentsUsed: [],
      toolCalls: [],
      steps: [],
      duration: Date.now() - startTime,
      error: "No matching agents",
    };
  }

  // 2. Select the best agent
  const selectedMatch = agentId
    ? matches.find((m) => m.agentId === agentId) || matches[0]
    : matches[0];

  const agent = await Agent.findById(selectedMatch.agentId)
    .populate("skills")
    .populate("tools")
    .lean();

  if (!agent) {
    return {
      success: false,
      response: "Selected agent not found.",
      agentsUsed: [],
      toolCalls: [],
      steps: [],
      duration: Date.now() - startTime,
      error: "Agent not found",
    };
  }

  // 3. Execute with the primary agent
  const { runAgentWithTools } = await import("@/lib/agent-tools");

  const systemPrompt = buildOrchestrationPrompt(agent, context, resourceType, resourceId, matches);

  const result = await runAgentWithTools({
    systemPrompt,
    messages: [
      { role: "user", content: message },
    ],
    model: agent.aiModel || "gpt-4o",
    temperature: agent.temperature || 0.7,
    maxTokens: agent.maxTokens || 4000,
    maxIterations,
  });

  // 4. If the agent wants to delegate, handle it
  const delegationCalls = result.toolCalls.filter((tc: { name: string }) => tc.name === "delegate_to_agent");

  const steps: StepResult[] = [];
  steps.push({
    step: 1,
    agentId: agent._id.toString(),
    agentName: agent.name,
    action: "primary-execution",
    status: "completed",
    result: result.response,
    duration: Date.now() - startTime,
  });

  // Process delegations (up to 2 levels deep)
  if (delegationCalls.length > 0 && maxAgents > 1) {
    for (const delegation of delegationCalls.slice(0, maxAgents - 1)) {
      const args = delegation.args as { agentSlug?: string; agentId?: string; message: string };
      const delegateResult = await executeDelegation(
        args,
        message,
        { userId, userRole, context, resourceType, resourceId },
        timeout - (Date.now() - startTime)
      );
      steps.push(delegateResult);
    }
  }

  // 5. Log execution
  const totalDuration = Date.now() - startTime;

  try {
    await AgentExecution.create({
      agent: agent._id,
      type: "chat",
      status: "completed",
      input: { message },
      output: { response: result.response, steps: steps.length },
      tokens: { prompt: 0, completion: 0, total: 0 },
      cost: 0,
      duration: totalDuration,
    });
  } catch {
    // Logging must not crash
  }

  // 6. Update agent stats
  try {
    await Agent.findByIdAndUpdate(agent._id, {
      $inc: { "stats.totalConversations": 1, "stats.totalMessages": 1 },
      $set: { "stats.lastActive": new Date() },
    });
  } catch {
    // Stats update must not crash
  }

  return {
    success: true,
    response: result.response,
    agentsUsed: steps.map((s) => ({ id: s.agentId, name: s.agentName, role: agent.role })),
    toolCalls: result.toolCalls.map((tc) => ({ tool: tc.name, args: tc.args as Record<string, unknown>, result: tc.result })),
    steps,
    duration: totalDuration,
  };
}

// ─── Workflow Execution ────────────────────────────────────────────────────

async function executeWorkflow(
  workflowId: string,
  inputMessage: string,
  context: { userId?: string; userRole?: string; context?: string; resourceType?: string; resourceId?: string },
  timeout: number
): Promise<OrchestrationResult> {
  const startTime = Date.now();
  const steps: StepResult[] = [];
  const allToolCalls: { tool: string; args: Record<string, unknown>; result: unknown }[] = [];
  const agentsUsed: { id: string; name: string; role: string }[] = [];

  const workflow = await AgentWorkflow.findById(workflowId).populate("steps.agent").lean();
  if (!workflow) {
    return {
      success: false,
      response: "Workflow not found.",
      agentsUsed: [],
      toolCalls: [],
      steps: [],
      duration: 0,
      error: "Workflow not found",
    };
  }

  let previousOutput = inputMessage;

  for (const step of workflow.steps.sort((a: { order: number }, b: { order: number }) => a.order - b.order)) {
    // Check timeout
    if (Date.now() - startTime > timeout) {
      steps.push({
        step: step.order,
        agentId: String(step.agent?._id || ""),
        agentName: (step.agent as { name?: string })?.name || "Unknown",
        action: "workflow-step",
        status: "skipped",
        result: "Timeout exceeded",
        duration: Date.now() - startTime,
        error: "Timeout",
      });
      break;
    }

    // Check condition
    if (step.condition && !evaluateCondition(step.condition, previousOutput)) {
      steps.push({
        step: step.order,
        agentId: String(step.agent?._id || ""),
        agentName: (step.agent as { name?: string })?.name || "Unknown",
        action: "workflow-step",
        status: "skipped",
        result: "Condition not met",
        duration: 0,
      });
      continue;
    }

    const stepStart = Date.now();
    let retries = 0;
    let lastError: string | undefined;

    while (retries <= (step.maxRetries || 0)) {
      try {
        const { runAgentWithTools } = await import("@/lib/agent-tools");

        const agent = await Agent.findById(step.agent).lean();
        if (!agent) {
          lastError = "Agent not found";
          break;
        }

        const result = await runAgentWithTools({
          systemPrompt: agent.systemPrompt || `You are ${agent.name}.`,
          messages: [
            { role: "user", content: previousOutput },
          ],
          model: agent.aiModel || "gpt-4o",
          temperature: agent.temperature || 0.7,
          maxTokens: agent.maxTokens || 4000,
          maxIterations: 3,
        });

        previousOutput = result.response;
        allToolCalls.push(...result.toolCalls.map((tc) => ({ tool: tc.name, args: tc.args as Record<string, unknown>, result: tc.result })));

        steps.push({
          step: step.order,
          agentId: agent._id.toString(),
          agentName: agent.name,
          action: `workflow-step-${step.order}`,
          status: "completed",
          result: result.response,
          duration: Date.now() - stepStart,
        });

        agentsUsed.push({ id: agent._id.toString(), name: agent.name, role: agent.role });

        break; // Success, exit retry loop
      } catch (error) {
        lastError = String(error);
        retries++;
        if (retries > (step.maxRetries || 0)) {
          steps.push({
            step: step.order,
            agentId: String(step.agent?._id || ""),
            agentName: (step.agent as { name?: string })?.name || "Unknown",
            action: "workflow-step",
            status: step.onError === "skip" ? "skipped" : "failed",
            result: lastError,
            duration: Date.now() - stepStart,
            error: lastError,
          });

          if (step.onError === "stop") {
            return {
              success: false,
              response: `Workflow failed at step ${step.order}: ${lastError}`,
              agentsUsed,
              toolCalls: allToolCalls,
              steps,
              duration: Date.now() - startTime,
              error: lastError,
            };
          }
          if (step.onError === "escalate") {
            steps.push({
              step: step.order,
              agentId: "system",
              agentName: "Escalation",
              action: "escalate",
              status: "completed",
              result: `Escalated to human: ${lastError}`,
              duration: 0,
            });
          }
        }
      }
    }
  }

  // Update workflow usage
  try {
    await AgentWorkflow.findByIdAndUpdate(workflowId, {
      $inc: { "usage.totalRuns": 1 },
      $set: { "usage.lastRun": new Date() },
    });
  } catch {
    // Must not crash
  }

  return {
    success: true,
    response: previousOutput,
    agentsUsed,
    toolCalls: allToolCalls,
    steps,
    duration: Date.now() - startTime,
  };
}

// ─── Delegation Execution ──────────────────────────────────────────────────

async function executeDelegation(
  delegation: { agentSlug?: string; agentId?: string; message: string },
  originalMessage: string,
  context: { userId?: string; userRole?: string; context?: string; resourceType?: string; resourceId?: string },
  timeout: number
): Promise<StepResult> {
  const start = Date.now();

  // Find the target agent
  let targetAgent;
  if (delegation.agentId) {
    targetAgent = await Agent.findById(delegation.agentId).lean();
  } else if (delegation.agentSlug) {
    targetAgent = await Agent.findOne({ slug: delegation.agentSlug, status: "active" }).lean();
  }

  if (!targetAgent) {
    return {
      step: 99,
      agentId: delegation.agentId || delegation.agentSlug || "unknown",
      agentName: "Unknown Agent",
      action: "delegation",
      status: "failed",
      result: "Delegate agent not found",
      duration: Date.now() - start,
      error: "Agent not found",
    };
  }

  try {
    const { runAgentWithTools } = await import("@/lib/agent-tools");

    const result = await runAgentWithTools({
      systemPrompt: targetAgent.systemPrompt || `You are ${targetAgent.name}.`,
      messages: [
        { role: "user", content: delegation.message || originalMessage },
      ],
      model: targetAgent.aiModel || "gpt-4o",
      temperature: targetAgent.temperature || 0.7,
      maxTokens: targetAgent.maxTokens || 4000,
      maxIterations: 3,
    });

    return {
      step: 99,
      agentId: targetAgent._id.toString(),
      agentName: targetAgent.name,
      action: "delegation",
      status: "completed",
      result: result.response,
      duration: Date.now() - start,
    };
  } catch (error) {
    return {
      step: 99,
      agentId: targetAgent._id.toString(),
      agentName: targetAgent.name,
      action: "delegation",
      status: "failed",
      result: String(error),
      duration: Date.now() - start,
      error: String(error),
    };
  }
}

// ─── Helpers ───────────────────────────────────────────────────────────────

function buildOrchestrationPrompt(
  agent: { name: string; systemPrompt?: string; role?: string },
  context: string,
  resourceType?: string,
  resourceId?: string,
  matchedAgents?: { name: string; role: string; score: number }[]
): string {
  const parts: string[] = [];

  parts.push(`You are ${agent.name}, an AI agent for Wall-V.`);
  if (agent.systemPrompt) parts.push(agent.systemPrompt);

  parts.push(`\nContext: ${context}`);
  if (resourceType) parts.push(`Resource type: ${resourceType}`);
  if (resourceId) parts.push(`Resource ID: ${resourceId}`);

  if (matchedAgents && matchedAgents.length > 1) {
    parts.push(`\nOther available agents for this request:`);
    for (const m of matchedAgents.slice(1)) {
      parts.push(`- ${m.name} (${m.role}, score: ${m.score})`);
    }
    parts.push(`If you need specialized help, use the delegate_to_agent tool to hand off work.`);
  }

  parts.push(`\nProvide helpful, actionable responses. Use tools when needed.`);
  return parts.join("\n");
}

function evaluateCondition(condition: string, output: string): boolean {
  // Simple condition evaluation
  // Supports: "contains:keyword", "not-empty", "length:>100"
  if (condition === "not-empty") return output.length > 0;
  if (condition.startsWith("contains:")) {
    return output.toLowerCase().includes(condition.slice(9).toLowerCase());
  }
  if (condition.startsWith("length:>")) {
    return output.length > parseInt(condition.slice(8));
  }
  return true; // Unknown condition = pass
}
