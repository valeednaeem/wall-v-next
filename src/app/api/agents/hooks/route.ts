import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import AgentHook from "@/models/agent-hook";
import connectToDatabase from "@/lib/mongodb";

export async function GET() {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    await connectToDatabase();
    const hooks = await AgentHook.find({}).populate("agent", "name slug").populate("createdBy", "name email").sort({ createdAt: -1 });
    return NextResponse.json({ hooks });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to fetch hooks";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    await connectToDatabase();
    const body = await request.json();
    const { name, description, type, agent, config, conditions, actions, isGlobal, priority } = body;

    if (!name || !type || !agent) {
      return NextResponse.json({ error: "Name, type, and agent are required" }, { status: 400 });
    }

    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

    const existing = await AgentHook.findOne({ slug });
    if (existing) {
      return NextResponse.json({ error: "A hook with this name already exists" }, { status: 409 });
    }

    const hook = await AgentHook.create({
      name,
      slug,
      description: description || "",
      type,
      agent,
      config: config || {},
      conditions: conditions || [],
      actions: actions || [],
      isGlobal: isGlobal ?? false,
      priority: priority ?? 0,
      createdBy: user.userId,
    });

    return NextResponse.json({ hook }, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to create hook";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
