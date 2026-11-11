import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { generateReport, getReports, getReportById, REPORT_TEMPLATES } from "@/lib/pm-reports";

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const action = searchParams.get("action") || "list";

    if (action === "list") {
      const limit = parseInt(searchParams.get("limit") || "50");
      const type = searchParams.get("type") || undefined;
      const reports = await getReports(limit, type);
      return NextResponse.json({ reports });
    }

    if (action === "templates") {
      return NextResponse.json({ templates: REPORT_TEMPLATES });
    }

    if (action === "get") {
      const id = searchParams.get("id");
      if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
      const report = await getReportById(id);
      if (!report) return NextResponse.json({ error: "Report not found" }, { status: 404 });
      return NextResponse.json({ report });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("Reports API GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const { type, projectId, period } = body;

    if (!type) return NextResponse.json({ error: "type required" }, { status: 400 });

    const report = await generateReport(type, projectId, period);
    return NextResponse.json({ report });
  } catch (error) {
    console.error("Reports API POST error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
