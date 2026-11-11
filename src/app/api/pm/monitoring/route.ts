import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { getSystemHealth, generateAlertsFromHealth, getMonitoringTimeline } from "@/lib/pm-monitoring";

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const action = searchParams.get("action") || "health";

    if (action === "health") {
      const health = await getSystemHealth();
      return NextResponse.json({ health });
    }

    if (action === "timeline") {
      const days = parseInt(searchParams.get("days") || "7");
      const timeline = await getMonitoringTimeline(days);
      return NextResponse.json({ timeline });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("Monitoring API error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const { action } = body;

    if (action === "run-checks") {
      const result = await generateAlertsFromHealth();
      return NextResponse.json({ result });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("Monitoring API POST error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
