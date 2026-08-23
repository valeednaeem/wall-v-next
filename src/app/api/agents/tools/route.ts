import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import AgentTool from "@/models/agent-tool";
import connectToDatabase from "@/lib/mongodb";

export async function GET() {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    await connectToDatabase();
    const tools = await AgentTool.find({}).populate("createdBy", "name email").sort({ createdAt: -1 });
    return NextResponse.json({ tools });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to fetch tools";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    await connectToDatabase();
    const body = await request.json();
    const { name, description, category, type, config, parameters, permissions } = body;

    if (!name || !type) {
      return NextResponse.json({ error: "Name and type are required" }, { status: 400 });
    }

    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

    const existing = await AgentTool.findOne({ slug });
    if (existing) {
      return NextResponse.json({ error: "A tool with this name already exists" }, { status: 409 });
    }

    const tool = await AgentTool.create({
      name,
      slug,
      description: description || "",
      category: category || "custom",
      type,
      config: config || {},
      parameters: parameters || [],
      permissions: permissions || [],
      createdBy: user.userId,
    });

    return NextResponse.json({ tool }, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to create tool";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
