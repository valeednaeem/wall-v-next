import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { orchestrateConversation, createVisitorState } from "@/lib/conversation-agent";

/**
 * POST /api/ai/execute
 *
 * THE canonical AI execution endpoint.
 * Uses the conversation orchestrator for full tool-calling pipeline.
 *
 * Body:
 *   message: string (required)
 *   conversationId?: string
 *   channel?: "chat" | "voice" | "website" | "dashboard" | "api"
 *   visitorState?: VisitorState (for resuming conversation)
 *   page?: string
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser();
    const body = await request.json();
    const { message, conversationId, channel, visitorState, page } = body;

    if (!message || typeof message !== "string" || message.trim().length === 0) {
      return NextResponse.json({ error: "Message is required" }, { status: 400 });
    }

    const state = visitorState
      ? { ...createVisitorState(), ...visitorState }
      : createVisitorState({
          source: channel || "chat",
          language: body.language || "en",
        });

    const result = await orchestrateConversation({
      message: message.trim(),
      conversationId,
      visitorState: state,
      channel: channel || "chat",
      userId: user?.userId,
      page,
    });

    return NextResponse.json({
      success: true,
      response: result.response,
      visitorState: result.visitorState,
      toolCallsMade: result.toolCallsMade.map((t) => ({
        tool: t.toolName,
        success: t.success,
        error: t.error,
      })),
      conversationId: result.conversationId,
      executionId: result.executionId,
      duration: result.duration,
      requiresProject: result.requiresProject,
      requiresConfirmation: result.requiresConfirmation,
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Execution failed";
    console.error("[AI Execute] Error:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
