import { NextResponse } from "next/server";
import { runProductionWorkflow, type ProductionRequirements } from "@/lib/production-workflow";
import { logError } from "@/lib/error-logger";
import { getAuthUser } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const user = await getAuthUser();
    if (!user || !["super-admin", "admin", "manager"].includes(user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const requirements: ProductionRequirements = body;

    if (!requirements.clientName || !requirements.clientEmail) {
      return NextResponse.json(
        { error: "clientName and clientEmail are required" },
        { status: 400 }
      );
    }

    const result = await runProductionWorkflow(requirements, {
      skipPreview: body.skipPreview || false,
      skipDemo: body.skipDemo || false,
      existingProjectId: body.existingProjectId,
    });

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error("[ProductionAnalysis] ERROR:", error);
    await logError({
      level: "error",
      message: "Production analysis failed",
      source: "api/ai/production-analysis",
      stack: error instanceof Error ? error.stack : undefined,
    });
    return NextResponse.json(
      { error: "Failed to run production analysis", detail: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
