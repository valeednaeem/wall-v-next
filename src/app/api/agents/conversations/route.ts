import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import AgentConversation from "@/models/agent-conversation";
import connectToDatabase from "@/lib/mongodb";
import { getDataScope, applyUserScope } from "@/lib/data-isolation";

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    await connectToDatabase();
    const { searchParams } = new URL(request.url);
    const agentId = searchParams.get("agentId");
    const status = searchParams.get("status");
    const channel = searchParams.get("channel");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");

    const scope = getDataScope(user);
    let query: Record<string, unknown> = {};
    if (agentId) query.agent = agentId;
    if (status) query.status = status;
    if (channel) query.channel = channel;

    query = applyUserScope(query, scope, "requestedBy");

    const [conversations, total] = await Promise.all([
      AgentConversation.find(query)
        .populate("agent", "name slug role")
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .select("-messages"),
      AgentConversation.countDocuments(query),
    ]);

    return NextResponse.json({
      conversations,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to fetch conversations";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
