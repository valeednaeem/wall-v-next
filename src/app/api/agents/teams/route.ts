import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { PERMISSIONS, hasPermission } from "@/lib/permissions";
import AgentTeam from "@/models/agent-team";
import connectToDatabase from "@/lib/mongodb";

export async function GET() {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    await connectToDatabase();
    const teams = await AgentTeam.find({})
      .populate("members.agent", "name slug role division status")
      .populate("leadAgent", "name slug role")
      .populate("createdBy", "name email")
      .sort({ createdAt: -1 });

    return NextResponse.json({ teams });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to fetch teams";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!hasPermission(user.permissions || [], PERMISSIONS.AGENTS_EDIT)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await connectToDatabase();
    const body = await request.json();
    const { name, description, members, leadAgent, tags, projectId, maxMembers } = body;

    if (!name) return NextResponse.json({ error: "name is required" }, { status: 400 });

    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

    const existing = await AgentTeam.findOne({ slug });
    if (existing) return NextResponse.json({ error: "A team with this name already exists" }, { status: 409 });

    const team = await AgentTeam.create({
      name,
      slug,
      description: description || "",
      members: members || [],
      leadAgent: leadAgent || undefined,
      tags: tags || [],
      projectId: projectId || undefined,
      maxMembers: maxMembers || 10,
      createdBy: user.userId,
    });

    return NextResponse.json({ team }, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to create team";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
