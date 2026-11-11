import { NextResponse } from "next/server";
import Agent from "@/models/agent";
import AgentTool from "@/models/agent-tool";
import AgentSkill from "@/models/agent-skill";
import AgentHook from "@/models/agent-hook";
import connectToDatabase from "@/lib/mongodb";

void AgentTool;
void AgentSkill;
void AgentHook;

export async function GET() {
  try {
    await connectToDatabase();

    const agent = await Agent.findOne({
      status: "active",
      isClientFacing: true,
    })
      .select("name slug isMasterAgent isClientFacing description")
      .lean();

    if (!agent) {
      return NextResponse.json({ error: "No active agent found" }, { status: 404 });
    }

    return NextResponse.json({ agent });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to fetch agent";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
