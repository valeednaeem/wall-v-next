import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { generateProjectUpdate, generateProgressReport, getCalendarEvents, sendClientUpdate } from "@/lib/pm-client-comm";

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const action = searchParams.get("action") || "calendar";

    if (action === "calendar") {
      const days = parseInt(searchParams.get("days") || "30");
      const events = await getCalendarEvents(days);
      return NextResponse.json({ events });
    }

    if (action === "update") {
      const projectId = searchParams.get("projectId");
      if (!projectId) return NextResponse.json({ error: "projectId required" }, { status: 400 });
      const update = await generateProjectUpdate(projectId);
      return NextResponse.json({ update });
    }

    if (action === "report") {
      const projectId = searchParams.get("projectId");
      const period = (searchParams.get("period") || "weekly") as "weekly" | "monthly";
      if (!projectId) return NextResponse.json({ error: "projectId required" }, { status: 400 });
      const report = await generateProgressReport(projectId, period);
      return NextResponse.json({ report });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("Communications API GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const { action, projectId } = body;

    if (action === "send-update") {
      const update = await generateProjectUpdate(projectId);
      const result = await sendClientUpdate(update);
      return NextResponse.json({ update, result });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("Communications API POST error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
