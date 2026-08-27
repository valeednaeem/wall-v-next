import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { PERMISSIONS, hasPermission } from "@/lib/permissions";
import Agent from "@/models/agent";
import AgentSkill from "@/models/agent-skill";
import connectToDatabase from "@/lib/mongodb";

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!hasPermission(user.permissions || [], PERMISSIONS.AGENTS_EDIT)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await connectToDatabase();
    const { agentId, skillIds, action } = await request.json();

    if (!agentId || !skillIds?.length) {
      return NextResponse.json({ error: "agentId and skillIds are required" }, { status: 400 });
    }

    const agent = await Agent.findById(agentId);
    if (!agent) return NextResponse.json({ error: "Agent not found" }, { status: 404 });

    let update;
    if (action === "remove") {
      update = { $pullAll: { skills: skillIds } };
    } else {
      update = { $addToSet: { skills: { $each: skillIds } } };
    }

    const updated = await Agent.findByIdAndUpdate(agentId, update, { new: true })
      .populate("skills", "name slug category status");

    // Also update each skill's supportedAgents
    for (const skillId of skillIds) {
      if (action === "remove") {
        await AgentSkill.findByIdAndUpdate(skillId, { $pull: { supportedAgents: agentId } });
      } else {
        await AgentSkill.findByIdAndUpdate(skillId, { $addToSet: { supportedAgents: agentId } });
      }
    }

    return NextResponse.json({ agent: updated });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to assign skills";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
