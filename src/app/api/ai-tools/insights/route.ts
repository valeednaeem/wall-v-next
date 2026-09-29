import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { requireAiToolsPermission } from "@/lib/tools/api-guard";
import { PERMISSIONS } from "@/lib/permissions";
import { handleApiError } from "@/lib/api-middleware";
import { resolveRange } from "@/lib/tools/date-range";
import { generateInsights } from "@/lib/tools/insights";

export async function GET(request: Request) {
  try {
    const guard = await requireAiToolsPermission(PERMISSIONS.AI_TOOLS_ANALYTICS);
    if (guard.error) return guard.error;

    const { searchParams } = new URL(request.url);
    const range = resolveRange(
      searchParams.get("range"),
      searchParams.get("start"),
      searchParams.get("end")
    );

    await connectToDatabase();
    const insights = await generateInsights(range.from, range.to);

    return NextResponse.json({
      success: true,
      data: {
        insights,
        range: { from: range.from, to: range.to, label: range.label, key: range.key },
      },
    });
  } catch (error) {
    return handleApiError(error, "ai-tools insights GET");
  }
}
