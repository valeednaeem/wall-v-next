import { NextRequest, NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongodb";
import Agent from "@/models/agent";

const SEED_SECRET = process.env.SEED_SECRET || "wall-v-seed-2024";

export async function PUT(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const secret = searchParams.get("secret");
    if (secret !== SEED_SECRET) {
      return NextResponse.json({ error: "Invalid secret" }, { status: 403 });
    }

    await connectToDatabase();

    const agent = await Agent.findOne({ slug: "master-client-agent" });
    if (!agent) {
      return NextResponse.json({ error: "Master Agent not found" }, { status: 404 });
    }

    const body = await request.json().catch(() => ({}));

    agent.channels = {
      website: true,
      whatsapp: true,
      email: true,
      api: true,
      dashboard: true,
      voice: true,
      ...body.channels,
    };
    agent.status = "active";
    await agent.save();

    return NextResponse.json({
      message: "Master Agent updated",
      channels: agent.channels,
      status: agent.status,
    });
  } catch (error) {
    console.error("Update error:", error);
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }
}
