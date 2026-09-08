import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import ContentExecution from "@/models/content-execution";

export async function GET(request: Request) {
  try {
    await connectToDatabase();
    const { searchParams } = new URL(request.url);
    const campaignId = searchParams.get("campaignId");
    const planId = searchParams.get("planId");
    const status = searchParams.get("status");
    const type = searchParams.get("type");
    const limit = parseInt(searchParams.get("limit") || "50", 10);
    const offset = parseInt(searchParams.get("offset") || "0", 10);

    const filter: Record<string, unknown> = {};
    if (campaignId) filter.campaign = campaignId;
    if (planId) filter.plan = planId;
    if (status) filter.status = status;
    if (type) filter.type = type;

    const [executions, total] = await Promise.all([
      ContentExecution.find(filter)
        .sort({ startedAt: -1 })
        .skip(offset)
        .limit(limit)
        .lean(),
      ContentExecution.countDocuments(filter),
    ]);

    return NextResponse.json({ executions, total, limit, offset });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
