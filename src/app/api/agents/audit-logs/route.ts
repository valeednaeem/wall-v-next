import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { PERMISSIONS, hasPermission } from "@/lib/permissions";
import AgentAuditLog from "@/models/agent-audit-log";
import connectToDatabase from "@/lib/mongodb";

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!hasPermission(user.permissions || [], PERMISSIONS.AGENTS_MONITOR)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await connectToDatabase();
    const { searchParams } = new URL(request.url);
    const agentId = searchParams.get("agentId");
    const category = searchParams.get("category");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");

    const query: Record<string, unknown> = {};
    if (agentId) query.agent = agentId;
    if (category) query.category = category;

    const [logs, total] = await Promise.all([
      AgentAuditLog.find(query)
        .populate("agent", "name slug")
        .populate("performedBy", "name email")
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      AgentAuditLog.countDocuments(query),
    ]);

    return NextResponse.json({
      logs,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to fetch audit logs";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
