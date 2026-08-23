import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import AgentSkill from "@/models/agent-skill";
import connectToDatabase from "@/lib/mongodb";

export async function GET() {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    await connectToDatabase();
    const skills = await AgentSkill.find({}).populate("createdBy", "name email").sort({ createdAt: -1 });
    return NextResponse.json({ skills });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to fetch skills";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    await connectToDatabase();
    const body = await request.json();
    const { name, description, category, instructions, systemPrompt, capabilities, requiredTools, triggers } = body;

    if (!name || !instructions) {
      return NextResponse.json({ error: "Name and instructions are required" }, { status: 400 });
    }

    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

    const existing = await AgentSkill.findOne({ slug });
    if (existing) {
      return NextResponse.json({ error: "A skill with this name already exists" }, { status: 409 });
    }

    const skill = await AgentSkill.create({
      name,
      slug,
      description: description || "",
      category: category || "conversation",
      instructions,
      systemPrompt,
      capabilities: capabilities || [],
      requiredTools: requiredTools || [],
      triggers: triggers || [],
      createdBy: user.userId,
    });

    return NextResponse.json({ skill }, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to create skill";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
