import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { getAiWorkforce, getHumanWorkforce, getWorkforceSummary, findCapableResources } from "@/lib/pm-workforce";

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const view = searchParams.get("view") || "summary";
    const skill = searchParams.get("skill");

    if (view === "ai") {
      const agents = await getAiWorkforce();
      return NextResponse.json({ agents });
    }

    if (view === "human") {
      const humans = await getHumanWorkforce();
      return NextResponse.json({ humans });
    }

    if (skill) {
      const resources = await findCapableResources(skill);
      return NextResponse.json(resources);
    }

    const summary = await getWorkforceSummary();
    return NextResponse.json({ summary });
  } catch (error) {
    console.error("Workforce API error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
