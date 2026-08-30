/**
 * Conversation Agent — the complete orchestration system.
 *
 * Usage:
 *   import { orchestrateConversation, createVisitorState } from "@/lib/conversation-agent";
 *
 *   const result = await orchestrateConversation({
 *     message: "I need a website, my name is John",
 *     channel: "chat",
 *   });
 *
 *   // result.response — what the agent said
 *   // result.visitorState — structured data collected
 *   // result.toolCallsMade — verified tool results
 */

export { orchestrateConversation } from "./orchestrator";
export { extractFromMessage, determineRequiredActions } from "./state-manager";
export { createVisitorState } from "./types";
export { executeConversationTool } from "./tool-executor";
export { CONVERSATION_TOOLS, getOpenAITools, validateToolArgs } from "./tool-registry";
export type { VisitorState, ToolResult, OrchestrationResult, ConversationToolDefinition } from "./types";
