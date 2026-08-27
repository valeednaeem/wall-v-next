import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import connectToDatabase from "@/lib/mongodb";
import { matchAgents, MatchInput } from "@/lib/agent-matching";

void connectToDatabase;

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const input: MatchInput = {
      requirement: body.requirement,
      projectType: body.projectType,
      requiredSkills: body.requiredSkills,
      requiredTools: body.requiredTools,
      complexity: body.complexity,
      context: body.context,
      channel: body.channel,
      excludeAgentIds: body.excludeAgentIds,
      limit: body.limit || 10,
    };

    if (!input.requirement) {
      return NextResponse.json({ error: "requirement is required" }, { status: 400 });
    }

    const results = await matchAgents(input);
    return NextResponse.json({ results, count: results.length });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Matching failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
