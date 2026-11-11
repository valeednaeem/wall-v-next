import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { getProjectFinancials, getFinancialSummary, checkBudgetAlerts, generateBudgetAlerts } from "@/lib/pm-financials";

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const action = searchParams.get("action") || "summary";

    if (action === "summary") {
      const summary = await getFinancialSummary();
      return NextResponse.json({ summary });
    }

    if (action === "project") {
      const projectId = searchParams.get("projectId");
      if (!projectId) return NextResponse.json({ error: "projectId required" }, { status: 400 });
      const financials = await getProjectFinancials(projectId);
      return NextResponse.json({ financials });
    }

    if (action === "budget-alerts") {
      const alerts = await checkBudgetAlerts();
      return NextResponse.json({ alerts });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("Financials API GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const { action } = body;

    if (action === "generate-budget-alerts") {
      const result = await generateBudgetAlerts();
      return NextResponse.json({ result });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("Financials API POST error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
