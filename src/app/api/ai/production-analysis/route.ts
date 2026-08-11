import { NextResponse } from "next/server";
import { runProductionWorkflow, type ProductionRequirements } from "@/lib/production-workflow";
import { logError } from "@/lib/error-logger";

export async function POST(request: Request) {
  try {
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
    await logError({
      level: "error",
      message: "Production analysis failed",
      source: "api/ai/production-analysis",
      stack: error instanceof Error ? error.stack : undefined,
    });
    return NextResponse.json(
      { error: "Failed to run production analysis" },
      { status: 500 }
    );
  }
}
