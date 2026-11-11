import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import connectToDatabase from "@/lib/mongodb";
import AgentConversation from "@/models/agent-conversation";
import AgentExecution from "@/models/agent-execution";
import { getDataScope, applyUserScope, filterSensitiveFields } from "@/lib/data-isolation";

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    await connectToDatabase();

    const url = new URL(request.url);
    const type = url.searchParams.get("type") || "conversations";
    const page = parseInt(url.searchParams.get("page") || "1");
    const limit = parseInt(url.searchParams.get("limit") || "20");

    const scope = getDataScope(user);

    if (type === "executions") {
      const query = applyUserScope({}, scope, "requestedBy");
      const [executions, total] = await Promise.all([
        AgentExecution.find(query)
          .populate("agent", "name slug role division avatar")
          .populate("conversation", "channel status")
          .sort({ createdAt: -1 })
          .skip((page - 1) * limit)
          .limit(limit)
          .lean(),
        AgentExecution.countDocuments(query),
      ]);

      return NextResponse.json({
        executions: executions.map((e) => filterSensitiveFields(e, user.role)),
        pagination: { page, limit, total, pages: Math.ceil(total / limit) },
      });
    }

    const query = applyUserScope({}, scope, "requestedBy");
    const [conversations, total] = await Promise.all([
      AgentConversation.find(query)
        .populate("agent", "name slug role division avatar")
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .select("-messages")
        .lean(),
      AgentConversation.countDocuments(query),
    ]);

    return NextResponse.json({
      conversations: conversations.map((c) => filterSensitiveFields(c, user.role)),
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to fetch history";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
