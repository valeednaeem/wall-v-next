import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { checkRateLimit, getClientIp } from "@/lib/security";
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
 *
 * Rate limiting (see @/lib/security): keyed per authenticated user or per
 * anonymous IP so public traffic cannot exhaust a staff member's quota. The
 * store is process-local — per-instance protection only on Vercel. Anonymous
 * traffic is capped strictly because this endpoint runs the full LLM + tool
 * pipeline, including inquiry/lead writes and emails.
 */
const RATE_LIMITS = {
  ANONYMOUS: { max: 10, windowMs: 60_000 },
  AUTHENTICATED: { max: 30, windowMs: 60_000 },
} as const;

function rateLimitedResponse(resetAt: number) {
  const retryAfterSeconds = Math.max(1, Math.ceil((resetAt - Date.now()) / 1000));
  return NextResponse.json(
    { error: "Too many requests. Please try again later.", retryAfterSeconds },
    { status: 429, headers: { "Retry-After": String(retryAfterSeconds) } }
  );
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser();

    // Enforced BEFORE body parsing, LLM calls, tool execution, and any
    // inquiry/lead creation or email sending.
    const ip = getClientIp(request);
    const limit = user ? RATE_LIMITS.AUTHENTICATED : RATE_LIMITS.ANONYMOUS;
    const rl = checkRateLimit(`ai-execute:${user?.userId || ip}`, limit.max, limit.windowMs);
    if (!rl.allowed) {
      return rateLimitedResponse(rl.resetAt);
    }

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
      userRole: user?.role,
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
