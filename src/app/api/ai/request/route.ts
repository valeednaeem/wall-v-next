import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import connectToDatabase from "@/lib/mongodb";
import Agent from "@/models/agent";
import AgentConversation from "@/models/agent-conversation";
import AgentExecution from "@/models/agent-execution";
import { classifyRequest, resolveCapabilities } from "@/lib/capability-registry";
import { resolveAgents } from "@/lib/agent-resolver";

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser();
    await connectToDatabase();

    const body = await request.json();
    const { message, context, channel } = body;

    if (!message || typeof message !== "string" || message.trim().length === 0) {
      return NextResponse.json({ error: "Message is required" }, { status: 400 });
    }

    const classified = classifyRequest(message);
    const capabilities = resolveCapabilities(classified);

    if (capabilities.length === 0) {
      return NextResponse.json({
        success: true,
        classified,
        capabilities: [],
        resolution: null,
        message: "No matching capabilities found. Please describe your request differently or contact support.",
      });
    }

    const primaryCapability = capabilities[0];
    const userRole = user?.role || undefined;

    const resolution = await resolveAgents(
      classified,
      primaryCapability,
      userRole,
      [],
      5
    );

    const visitorInfo = {
      id: user?.userId || "anonymous",
      name: user?.email?.split("@")[0] || "Anonymous",
      email: user?.email || "",
    };

    let conversation = null;
    if (resolution.success && resolution.primaryAgent) {
      conversation = await AgentConversation.create({
        agent: resolution.primaryAgent.agentId,
        sessionId: `req-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        channel: channel || "website",
        status: "active",
        visitor: visitorInfo,
        requestedBy: user?.userId || null,
        context: {
          page: context?.page || "/ai-request",
          referrer: context?.referrer || "",
          language: context?.language || "en",
          metadata: {
            requestType: classified.requestType,
            capabilityId: primaryCapability.id,
            confidence: classified.confidence,
          },
        },
        messages: [
          { role: "user", content: message, timestamp: new Date() },
        ],
      });
    }

    const execution = conversation && resolution.primaryAgent ? await AgentExecution.create({
      agent: resolution.primaryAgent.agentId,
      conversation: conversation._id,
      type: "skill-invoke",
      status: "pending",
      requestedBy: user?.userId || null,
      input: {
        message,
        skillId: primaryCapability.id,
        parameters: {
          requestType: classified.requestType,
          capability: primaryCapability.name,
          complexity: classified.complexity,
        },
      },
    }) : null;

    return NextResponse.json({
      success: true,
      classified: {
        requestType: classified.requestType,
        confidence: classified.confidence,
        complexity: classified.complexity,
        requiresProject: classified.requiresProject,
        keywords: classified.keywords,
      },
      capabilities: capabilities.map((c) => ({
        id: c.id,
        name: c.name,
        description: c.description,
        category: c.category,
        requiresProject: c.requiresProject,
        estimatedDuration: c.estimatedDuration,
        icon: c.icon,
      })),
      resolution: resolution.success ? {
        primaryAgent: resolution.primaryAgent ? {
          id: resolution.primaryAgent.agentId,
          name: resolution.primaryAgent.name,
          description: resolution.primaryAgent.description,
          role: resolution.primaryAgent.role,
          division: resolution.primaryAgent.division,
          avatar: resolution.primaryAgent.avatar,
          score: resolution.primaryAgent.score,
          reasons: resolution.primaryAgent.reasons,
        } : null,
        supportingAgents: resolution.supportingAgents.map((a) => ({
          id: a.agentId,
          name: a.name,
          role: a.role,
          score: a.score,
        })),
        totalQualified: resolution.totalQualified,
      } : null,
      conversation: conversation ? {
        id: conversation._id,
        sessionId: conversation.sessionId,
      } : null,
      execution: execution ? {
        id: execution._id,
        status: execution.status,
      } : null,
      meta: {
        requiresAuth: primaryCapability.requiresAuth,
        requiresProject: primaryCapability.requiresProject,
        estimatedDuration: primaryCapability.estimatedDuration,
        isAuthenticated: !!user,
        userRole: user?.role || "visitor",
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Request processing failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET() {
  try {
    const { CAPABILITY_REGISTRY } = await import("@/lib/capability-registry");

    return NextResponse.json({
      capabilities: CAPABILITY_REGISTRY.map((c) => ({
        id: c.id,
        name: c.name,
        description: c.description,
        category: c.category,
        icon: c.icon,
        estimatedDuration: c.estimatedDuration,
        requiresAuth: c.requiresAuth,
        requiresProject: c.requiresProject,
        requestTypes: c.requestTypes,
      })),
      categories: [...new Set(CAPABILITY_REGISTRY.map((c) => c.category))],
      totalCapabilities: CAPABILITY_REGISTRY.length,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to fetch capabilities";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
