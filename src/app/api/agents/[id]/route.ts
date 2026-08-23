import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import Agent from "@/models/agent";
import AgentConversation from "@/models/agent-conversation";
import AgentExecution from "@/models/agent-execution";
import connectToDatabase from "@/lib/mongodb";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    await connectToDatabase();
    const { id } = await params;

    const agent = await Agent.findById(id)
      .populate("skills")
      .populate("tools")
      .populate("hooks")
      .populate("createdBy", "name email");

    if (!agent) return NextResponse.json({ error: "Agent not found" }, { status: 404 });

    const conversations = await AgentConversation.countDocuments({ agent: agent._id });
    const executions = await AgentExecution.countDocuments({ agent: agent._id });
    const recentConversations = await AgentConversation.find({ agent: agent._id })
      .sort({ createdAt: -1 })
      .limit(10)
      .select("sessionId channel status outcome sentiment startedAt messageCount");

    return NextResponse.json({
      agent,
      stats: {
        totalConversations: conversations,
        totalExecutions: executions,
        recentConversations,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to fetch agent";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    await connectToDatabase();
    const { id } = await params;
    const body = await request.json();

    const agent = await Agent.findById(id);
    if (!agent) return NextResponse.json({ error: "Agent not found" }, { status: 404 });

    const allowedUpdates = [
      "name", "description", "type", "role", "status", "avatar", "personality",
      "systemPrompt", "instructions", "model", "temperature", "maxTokens",
      "skills", "tools", "hooks", "memory", "guardrails", "channels",
      "integrations", "isClientFacing", "isMasterAgent", "masterConfig",
    ];

    for (const key of allowedUpdates) {
      if (body[key] !== undefined) {
        (agent as Record<string, unknown>)[key] = body[key];
      }
    }

    await agent.save();

    return NextResponse.json({ agent });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to update agent";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    await connectToDatabase();
    const { id } = await params;

    const agent = await Agent.findById(id);
    if (!agent) return NextResponse.json({ error: "Agent not found" }, { status: 404 });

    if (agent.isMasterAgent) {
      return NextResponse.json({ error: "Cannot delete the master agent" }, { status: 400 });
    }

    await Agent.findByIdAndDelete(id);

    return NextResponse.json({ message: "Agent deleted" });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to delete agent";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
