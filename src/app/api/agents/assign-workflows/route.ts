import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { PERMISSIONS, hasPermission } from "@/lib/permissions";
import Agent from "@/models/agent";
import connectToDatabase from "@/lib/mongodb";
import { invalidateAgentConfig } from "@/lib/agent-registry";

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!hasPermission(user.permissions || [], PERMISSIONS.AGENTS_EDIT)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await connectToDatabase();
    const { agentId, workflowIds, action } = await request.json();

    if (!agentId || !workflowIds?.length) {
      return NextResponse.json({ error: "agentId and workflowIds are required" }, { status: 400 });
    }

    const agent = await Agent.findById(agentId);
    if (!agent) return NextResponse.json({ error: "Agent not found" }, { status: 404 });

    let update;
    if (action === "remove") {
      update = { $pullAll: { workflows: workflowIds } };
    } else {
      update = { $addToSet: { workflows: { $each: workflowIds } } };
    }

    const updated = await Agent.findByIdAndUpdate(agentId, update, { new: true })
      .populate("workflows", "name slug status description");

    // Invalidate registry cache
    invalidateAgentConfig(agentId);

    return NextResponse.json({ agent: updated });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to assign workflows";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
