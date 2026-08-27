import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { PERMISSIONS, hasPermission } from "@/lib/permissions";
import AgentExecution from "@/models/agent-execution";
import connectToDatabase from "@/lib/mongodb";

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!hasPermission(user.permissions || [], PERMISSIONS.AGENTS_MONITOR)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await connectToDatabase();
    const url = new URL(request.url);
    const status = url.searchParams.get("status");
    const type = url.searchParams.get("type");
    const agentId = url.searchParams.get("agentId");
    const page = parseInt(url.searchParams.get("page") || "1");
    const limit = parseInt(url.searchParams.get("limit") || "50");

    const query: Record<string, unknown> = {};
    if (status) query.status = status;
    if (type) query.type = type;
    if (agentId) query.agent = agentId;

    const [executions, total, stats] = await Promise.all([
      AgentExecution.find(query)
        .populate("agent", "name slug role division")
        .populate("conversation", "channel")
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      AgentExecution.countDocuments(query),
      AgentExecution.aggregate([
        { $match: {} },
        { $group: {
          _id: "$status",
          count: { $sum: 1 },
          totalCost: { $sum: "$cost" },
          totalTokens: { $sum: "$tokens.total" },
          avgDuration: { $avg: "$duration" },
        }},
      ]),
    ]);

    const statsMap: Record<string, { count: number; totalCost: number; totalTokens: number; avgDuration: number }> = {};
    for (const s of stats) {
      statsMap[s._id] = { count: s.count, totalCost: s.totalCost, totalTokens: s.totalTokens, avgDuration: s.avgDuration };
    }

    return NextResponse.json({
      executions,
      total,
      page,
      totalPages: Math.ceil(total / limit),
      stats: statsMap,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to fetch executions";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
