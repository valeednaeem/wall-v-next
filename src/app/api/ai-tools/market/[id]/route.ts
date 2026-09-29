import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectToDatabase } from "@/lib/mongodb";
import MarketResearch from "@/models/market-research";
import { marketResearchSchema } from "@/lib/validations/ai-tool";
import { requireAiToolsPermission, logAiToolAction } from "@/lib/tools/api-guard";
import { PERMISSIONS } from "@/lib/permissions";
import { handleApiError } from "@/lib/api-middleware";

interface Params {
  params: Promise<{ id: string }>;
}

export async function GET(_request: Request, { params }: Params) {
  try {
    const guard = await requireAiToolsPermission(PERMISSIONS.AI_TOOLS_ANALYTICS);
    if (guard.error) return guard.error;

    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    }

    await connectToDatabase();
    const entry = await MarketResearch.findById(id).lean();
    if (!entry) {
      return NextResponse.json({ error: "Entry not found" }, { status: 404 });
    }
    return NextResponse.json({ success: true, data: entry });
  } catch (error) {
    return handleApiError(error, "ai-tools market item GET");
  }
}

export async function PUT(request: Request, { params }: Params) {
  try {
    const guard = await requireAiToolsPermission(PERMISSIONS.AI_TOOLS_ANALYTICS);
    if (guard.error) return guard.error;

    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    }

    const body = await request.json();
    const parsed = marketResearchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    await connectToDatabase();
    const entry = await MarketResearch.findByIdAndUpdate(
      id,
      {
        ...parsed.data,
        researchedAt: parsed.data.researchedAt ? new Date(parsed.data.researchedAt) : undefined,
      },
      { new: true }
    );
    if (!entry) {
      return NextResponse.json({ error: "Entry not found" }, { status: 404 });
    }

    await logAiToolAction(guard.user, "market_research.updated", "MarketResearch", id, {
      competitor: entry.competitor,
      product: entry.product,
    });
    return NextResponse.json({ success: true, data: entry });
  } catch (error) {
    return handleApiError(error, "ai-tools market PUT");
  }
}

export async function DELETE(_request: Request, { params }: Params) {
  try {
    const guard = await requireAiToolsPermission(PERMISSIONS.AI_TOOLS_ANALYTICS);
    if (guard.error) return guard.error;

    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    }

    await connectToDatabase();
    const entry = await MarketResearch.findByIdAndDelete(id);
    if (!entry) {
      return NextResponse.json({ error: "Entry not found" }, { status: 404 });
    }

    await logAiToolAction(guard.user, "market_research.deleted", "MarketResearch", id, {
      competitor: entry.competitor,
      product: entry.product,
    });
    return NextResponse.json({ success: true, data: { id } });
  } catch (error) {
    return handleApiError(error, "ai-tools market DELETE");
  }
}
