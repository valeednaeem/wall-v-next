import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { orchestrate, OrchestrationRequest } from "@/lib/agent-orchestrator";
import { checkRateLimit, getClientIp, logSecurityEvent } from "@/lib/security";

/**
 * POST /api/agents/orchestrate
 * Multi-agent orchestration endpoint.
 * Matches agents, executes workflows, handles delegation.
 *
 * Body: OrchestrationRequest
 */
export async function POST(request: Request) {
  const ip = getClientIp(request);
  const user = await getAuthUser();

  try {
    // Rate limit: 10 per minute
    const rl = checkRateLimit("orchestrate:" + (user?.userId || ip), 10, 60 * 1000);
    if (!rl.allowed) {
      return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
    }

    const body = await request.json();
    const {
      message,
      context,
      resourceType,
      resourceId,
      workflowId,
      agentId,
      maxAgents,
      maxIterations,
      timeout,
    } = body;

    if (!message) {
      return NextResponse.json({ error: "message is required" }, { status: 400 });
    }

    const orchestrationRequest: OrchestrationRequest = {
      message,
      context,
      resourceType,
      resourceId,
      userId: user?.userId,
      userRole: user?.role || "customer",
      channel: "dashboard",
      workflowId,
      agentId,
      maxAgents,
      maxIterations,
      timeout,
    };

    const result = await orchestrate(orchestrationRequest);

    if (!result.success) {
      await logSecurityEvent({
        type: "suspicious_activity",
        severity: "low",
        userId: user?.userId,
        ip,
        path: "/api/agents/orchestrate",
        method: "POST",
        details: { error: result.error },
      });
    }

    return NextResponse.json({ success: result.success, data: result });
  } catch (error) {
    console.error("Orchestrate error:", error);
    return NextResponse.json({ error: "Orchestration failed" }, { status: 500 });
  }
}
