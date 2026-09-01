import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { PERMISSIONS, hasPermission } from "@/lib/permissions";
import Agent from "@/models/agent";
import connectToDatabase from "@/lib/mongodb";

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!hasPermission(user.permissions || [], PERMISSIONS.AGENTS_EDIT)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await connectToDatabase();
    const { agentId, toolIds, action } = await request.json();

    if (!agentId || !toolIds?.length) {
      return NextResponse.json({ error: "agentId and toolIds are required" }, { status: 400 });
    }

    const agent = await Agent.findById(agentId);
    if (!agent) return NextResponse.json({ error: "Agent not found" }, { status: 404 });

    let update;
    if (action === "remove") {
      update = { $pullAll: { tools: toolIds } };
    } else {
      update = { $addToSet: { tools: { $each: toolIds } } };
    }

    const updated = await Agent.findByIdAndUpdate(agentId, update, { new: true })
      .populate("tools", "name slug category type isWriteOperation riskLevel status");

    return NextResponse.json({ agent: updated });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to assign tools";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
