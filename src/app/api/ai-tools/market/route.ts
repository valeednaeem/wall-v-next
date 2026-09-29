import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import MarketResearch from "@/models/market-research";
import { marketResearchSchema } from "@/lib/validations/ai-tool";
import { requireAiToolsPermission, logAiToolAction } from "@/lib/tools/api-guard";
import { PERMISSIONS } from "@/lib/permissions";
import { handleApiError } from "@/lib/api-middleware";

export async function GET() {
  try {
    const guard = await requireAiToolsPermission(PERMISSIONS.AI_TOOLS_ANALYTICS);
    if (guard.error) return guard.error;

    await connectToDatabase();
    const entries = await MarketResearch.find({})
      .sort({ researchedAt: -1 })
      .limit(200)
      .lean();

    return NextResponse.json({ success: true, data: entries });
  } catch (error) {
    return handleApiError(error, "ai-tools market GET");
  }
}

export async function POST(request: Request) {
  try {
    const guard = await requireAiToolsPermission(PERMISSIONS.AI_TOOLS_ANALYTICS);
    if (guard.error) return guard.error;

    const body = await request.json();
    const parsed = marketResearchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    await connectToDatabase();
    const entry = await MarketResearch.create({
      ...parsed.data,
      researchedAt: parsed.data.researchedAt ? new Date(parsed.data.researchedAt) : new Date(),
      createdBy: guard.user.userId,
    });

    await logAiToolAction(guard.user, "market_research.created", "MarketResearch", String(entry._id), {
      competitor: entry.competitor,
      product: entry.product,
    });
    return NextResponse.json({ success: true, data: entry }, { status: 201 });
  } catch (error) {
    return handleApiError(error, "ai-tools market POST");
  }
}
