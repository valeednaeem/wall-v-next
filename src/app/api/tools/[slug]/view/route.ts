import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import AITool from "@/models/ai-tool";
import { handleApiError } from "@/lib/api-middleware";
import { getClientIp, checkRateLimit } from "@/lib/security";
import { recordFunnelEvent } from "@/lib/tools/recorder";

interface Params {
  params: Promise<{ slug: string }>;
}

export async function POST(request: Request, { params }: Params) {
  try {
    const { slug } = await params;
    const ip = getClientIp(request);

    const rateLimit = checkRateLimit(`tool-view:${ip}`, 30, 60000);
    if (!rateLimit.allowed) {
      return NextResponse.json({ ok: false, reason: "rate_limited" }, { status: 429 });
    }

    await connectToDatabase();
    const tool = await AITool.findOne({ slug, status: "published" }).select("_id").lean();
    if (!tool) {
      return NextResponse.json({ ok: false, reason: "not_found" }, { status: 404 });
    }

    recordFunnelEvent(String(tool._id), "views");
    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleApiError(error, "tools/[slug] view");
  }
}
