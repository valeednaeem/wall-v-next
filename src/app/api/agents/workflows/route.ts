import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { PERMISSIONS, hasPermission } from "@/lib/permissions";
import AgentWorkflow from "@/models/agent-workflow";
import connectToDatabase from "@/lib/mongodb";

export async function GET() {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!hasPermission(user.permissions || [], PERMISSIONS.WORKFLOWS_VIEW)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await connectToDatabase();
    const workflows = await AgentWorkflow.find({})
      .populate("steps.agent", "name slug role division")
      .populate("steps.skill", "name slug category")
      .populate("steps.tool", "name slug category")
      .populate("createdBy", "name email")
      .sort({ createdAt: -1 });

    return NextResponse.json({ workflows });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to fetch workflows";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!hasPermission(user.permissions || [], PERMISSIONS.WORKFLOWS_CREATE)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await connectToDatabase();
    const body = await request.json();
    const { name, description, trigger, steps, permissions, context } = body;

    if (!name || !trigger) {
      return NextResponse.json({ error: "name and trigger are required" }, { status: 400 });
    }

    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

    const existing = await AgentWorkflow.findOne({ slug });
    if (existing) {
      return NextResponse.json({ error: "A workflow with this name already exists" }, { status: 409 });
    }

    const workflow = await AgentWorkflow.create({
      name,
      slug,
      description: description || "",
      trigger,
      steps: steps || [],
      permissions: permissions || [],
      context: context || {},
      status: "draft",
      createdBy: user.userId,
    });

    return NextResponse.json({ workflow }, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to create workflow";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
