import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { executeAIRequest, type ExecutionContext } from "@/lib/ai-execution-engine";

/**
 * POST /api/ai/execute
 *
 * THE canonical AI execution endpoint.
 * Every entry point (chat, voice, dashboard, API) should call this.
 *
 * Body:
 *   message: string (required)
 *   conversationId?: string
 *   channel?: "chat" | "voice" | "website" | "dashboard" | "api"
 *   agentId?: string (force specific agent)
 *   page?: string
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser();
    const body = await request.json();
    const { message, conversationId, channel, agentId, page } = body;

    if (!message || typeof message !== "string" || message.trim().length === 0) {
      return NextResponse.json({ error: "Message is required" }, { status: 400 });
    }

    const context: ExecutionContext = {
      userId: user?.userId,
      userRole: user?.role,
      visitorId: user?.userId || `visitor-${Date.now()}`,
      visitorName: user?.email?.split("@")[0] || "Visitor",
      visitorEmail: user?.email || "",
      channel: channel || "chat",
      conversationId,
      page,
    };

    const result = await executeAIRequest({
      message: message.trim(),
      context,
      agentId,
    });

    return NextResponse.json({
      success: result.success,
      status: result.status,
      response: result.response,
      classified: {
        requestType: result.classified.requestType,
        confidence: result.classified.confidence,
        complexity: result.classified.complexity,
        requiresProject: result.classified.requiresProject,
      },
      capability: result.capability
        ? {
            id: result.capability.id,
            name: result.capability.name,
            category: result.capability.category,
            requiresProject: result.capability.requiresProject,
            estimatedDuration: result.capability.estimatedDuration,
          }
        : null,
      agent: result.selectedAgent
        ? {
            name: result.selectedAgent.name,
            role: result.selectedAgent.role,
            division: result.selectedAgent.division,
            score: result.selectedAgent.score,
          }
        : null,
      provider: result.provider,
      model: result.model,
      conversationId: result.conversationId,
      executionId: result.executionId,
      tokenUsage: result.tokenUsage,
      duration: result.duration,
      requiresProject: result.requiresProject,
      errors: result.errors.length > 0 ? result.errors : undefined,
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Execution failed";
    console.error("[AI Execute] Error:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
