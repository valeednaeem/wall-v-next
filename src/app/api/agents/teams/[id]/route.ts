import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { PERMISSIONS, hasPermission } from "@/lib/permissions";
import AgentTeam from "@/models/agent-team";
import connectToDatabase from "@/lib/mongodb";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    await connectToDatabase();
    const { id } = await params;
    const team = await AgentTeam.findById(id)
      .populate("members.agent", "name slug role division status stats")
      .populate("leadAgent", "name slug role")
      .populate("createdBy", "name email");

    if (!team) return NextResponse.json({ error: "Team not found" }, { status: 404 });
    return NextResponse.json({ team });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to fetch team";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!hasPermission(user.permissions || [], PERMISSIONS.AGENTS_EDIT)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await connectToDatabase();
    const { id } = await params;
    const body = await request.json();
    const allowedFields = ["name", "description", "status", "members", "leadAgent", "tags", "projectId", "maxMembers"];
    const updates: Record<string, unknown> = {};
    for (const key of allowedFields) {
      if (body[key] !== undefined) updates[key] = body[key];
    }

    const team = await AgentTeam.findByIdAndUpdate(id, updates, { new: true })
      .populate("members.agent", "name slug role division");

    if (!team) return NextResponse.json({ error: "Team not found" }, { status: 404 });
    return NextResponse.json({ team });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to update team";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!hasPermission(user.permissions || [], PERMISSIONS.AGENTS_DELETE)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await connectToDatabase();
    const { id } = await params;
    const team = await AgentTeam.findByIdAndDelete(id);
    if (!team) return NextResponse.json({ error: "Team not found" }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to delete team";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
