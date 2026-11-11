import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { runFullScan, runQuickScan, getScanHistory } from "@/lib/pm-scanner";

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const action = searchParams.get("action") || "history";

    if (action === "history") {
      const limit = parseInt(searchParams.get("limit") || "20");
      const history = await getScanHistory(limit);
      return NextResponse.json({ history });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("Scanner API GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const { action } = body;

    if (action === "full-scan") {
      const result = await runFullScan();
      return NextResponse.json({ result });
    }

    if (action === "quick-scan") {
      const result = await runQuickScan();
      return NextResponse.json({ result });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("Scanner API POST error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
