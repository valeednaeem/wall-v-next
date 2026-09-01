/**
 * Agent Registry — loads the effective configuration for an Agent.
 *
 * This is the single source of truth for:
 *   "What is Agent X allowed and configured to use RIGHT NOW?"
 *
 * Flow:
 *   Dashboard assigns Tool A to Agent X
 *   → Database: Agent.tools includes Tool A
 *   → Registry: loads Agent + populated tools/skills/workflows
 *   → Runtime: Tool A is available to the LLM
 */

import mongoose from "mongoose";
import connectToDatabase from "./mongodb";

// ─── Effective Agent Configuration ─────────────────────────────────────────

export interface EffectiveAgentConfig {
  agent: {
    _id: string;
    name: string;
    slug: string;
    description: string;
    type: string;
    role: string;
    status: string;
    systemPrompt: string;
    instructions: string[];
    aiModel: string;
    temperature: number;
    maxTokens: number;
    isClientFacing: boolean;
    isMasterAgent: boolean;
    division?: string;
    personality?: { tone: string; language: string; maxResponseLength?: number };
    guardrails: {
      blockedTopics: string[];
      maxConversationLength: number;
      requireApproval: boolean;
      contentFilter: boolean;
      fallbackMessage?: string;
    };
    channels: Record<string, boolean>;
    contexts: Record<string, boolean>;
    permissions: string[];
    integrations: Record<string, boolean>;
  };
  skills: Array<{
    _id: string;
    name: string;
    slug?: string;
    category: string;
    instructions?: string[];
    capabilities?: string[];
    triggers?: Array<{ type: string; value: string }>;
    requiredTools?: string[];
  }>;
  tools: Array<{
    _id: string;
    name: string;
    slug?: string;
    description: string;
    category: string;
    type: string;
    status: string;
    isWriteOperation: boolean;
    riskLevel: string;
    config?: {
      endpoint?: string;
      method?: string;
      headers?: Record<string, string>;
      bodyTemplate?: string;
      responseMapping?: string;
      timeout?: number;
    };
    parameters?: Array<{
      name: string;
      type: string;
      required: boolean;
      description?: string;
    }>;
    permissions?: string[];
  }>;
  workflows: Array<{
    _id: string;
    name: string;
    slug?: string;
    description?: string;
    status: string;
    trigger?: { type: string; value: string };
    steps?: Array<unknown>;
  }>;
}

// ─── Cache (in-memory, per-process) ───────────────────────────────────────

const configCache = new Map<string, { config: EffectiveAgentConfig; expiresAt: number }>();
const CACHE_TTL_MS = 30_000; // 30 seconds

// ─── Registry API ──────────────────────────────────────────────────────────

/**
 * Load the effective configuration for an agent.
 * Uses a short-lived cache to avoid repeated DB queries within the same process.
 */
export async function getEffectiveConfig(agentId: string): Promise<EffectiveAgentConfig | null> {
  const cached = configCache.get(agentId);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.config;
  }

  await connectToDatabase();

  // Dynamic import to avoid circular dependencies at module load time
  const { default: Agent } = await import("@/models/agent");

  const agent = await Agent.findById(agentId)
    .populate("skills")
    .populate("tools")
    .populate("workflows")
    .lean();

  if (!agent) return null;

  const config: EffectiveAgentConfig = {
    agent: {
      _id: String(agent._id),
      name: agent.name,
      slug: agent.slug,
      description: agent.description,
      type: agent.type,
      role: agent.role,
      status: agent.status,
      systemPrompt: agent.systemPrompt,
      instructions: agent.instructions || [],
      aiModel: agent.aiModel,
      temperature: agent.temperature,
      maxTokens: agent.maxTokens,
      isClientFacing: agent.isClientFacing,
      isMasterAgent: agent.isMasterAgent,
      division: agent.division,
      personality: agent.personality,
      guardrails: agent.guardrails,
      channels: agent.channels,
      contexts: agent.contexts,
      permissions: agent.permissions || [],
      integrations: agent.integrations,
    },
    skills: (agent.skills || []).map((s: any) => ({
      _id: String(s._id),
      name: s.name,
      slug: s.slug,
      category: s.category,
      instructions: s.instructions,
      capabilities: s.capabilities,
      triggers: s.triggers,
      requiredTools: s.requiredTools?.map((t: any) => String(t)),
    })),
    tools: (agent.tools || []).map((t: any) => ({
      _id: String(t._id),
      name: t.name,
      slug: t.slug,
      description: t.description,
      category: t.category,
      type: t.type,
      status: t.status,
      isWriteOperation: t.isWriteOperation,
      riskLevel: t.riskLevel,
      config: t.config,
      parameters: t.parameters,
      permissions: t.permissions,
    })),
    workflows: (agent.workflows || []).map((w: any) => ({
      _id: String(w._id),
      name: w.name,
      slug: w.slug,
      description: w.description,
      status: w.status,
      trigger: w.trigger,
      steps: w.steps,
    })),
  };

  configCache.set(agentId, { config, expiresAt: Date.now() + CACHE_TTL_MS });
  return config;
}

/**
 * Invalidate the cache for a specific agent.
 * Call this after any configuration change.
 */
export function invalidateAgentConfig(agentId: string): void {
  configCache.delete(agentId);
}

/**
 * Invalidate all cached configs.
 */
export function invalidateAllConfigs(): void {
  configCache.clear();
}

/**
 * Convert database tools to OpenAI function-calling format.
 * Merges hardcoded conversation tools with database-assigned tools.
 */
export function toOpenAITools(
  dbTools: EffectiveAgentConfig["tools"],
  includeHardcoded: boolean = true
): Array<{
  type: "function";
  function: { name: string; description: string; parameters: Record<string, unknown> };
}> {
  const tools: Array<{
    type: "function";
    function: { name: string; description: string; parameters: Record<string, unknown> };
  }> = [];

  // Include hardcoded conversation tools (they have real implementations)
  if (includeHardcoded) {
    const { CONVERSATION_TOOLS } = require("./conversation-agent/tool-registry");
    tools.push(...CONVERSATION_TOOLS);
  }

  // Add database-assigned tools that are active
  for (const dbTool of dbTools) {
    if (dbTool.status !== "active") continue;
    // Skip if already covered by hardcoded tools
    if (tools.some((t) => t.function.name === dbTool.name)) continue;

    tools.push({
      type: "function",
      function: {
        name: dbTool.name,
        description: dbTool.description,
        parameters: buildParametersSchema(dbTool.parameters || []),
      },
    });
  }

  return tools;
}

/**
 * Convert database tool parameters to JSON Schema format.
 */
function buildParametersSchema(
  params: NonNullable<EffectiveAgentConfig["tools"][0]["parameters"]>
): Record<string, unknown> {
  const properties: Record<string, unknown> = {};
  const required: string[] = [];

  for (const p of params) {
    properties[p.name] = {
      type: p.type,
      ...(p.description ? { description: p.description } : {}),
    };
    if (p.required) required.push(p.name);
  }

  return {
    type: "object",
    properties,
    ...(required.length > 0 ? { required } : {}),
  };
}

/**
 * Get skill context string for injection into system prompt.
 */
export function buildSkillContext(skills: EffectiveAgentConfig["skills"]): string {
  if (skills.length === 0) return "";

  const lines = ["## Available Skills", ""];
  for (const skill of skills) {
    lines.push(`### ${skill.name}`);
    if (skill.instructions?.length) {
      lines.push(skill.instructions.join("\n"));
    }
    lines.push("");
  }
  return lines.join("\n");
}

/**
 * Check if an agent has a specific permission.
 */
export function hasAgentPermission(
  config: EffectiveAgentConfig,
  permission: string
): boolean {
  if (config.agent.permissions.includes("*")) return true;
  return config.agent.permissions.includes(permission);
}

/**
 * Check if an agent is available on a specific channel.
 */
export function isAgentAvailableOnChannel(
  config: EffectiveAgentConfig,
  channel: string
): boolean {
  return config.agent.channels[channel] === true;
}
