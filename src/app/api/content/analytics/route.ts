import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { handleApiError, requireRole } from "@/lib/api-middleware";
import {
  getContentPerformance,
  getOverallPerformance,
  analyzePerformanceTrends,
} from "@/lib/content-analytics";

export async function GET(request: Request) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const roleError = requireRole(user, ["super-admin", "admin", "manager"]);
    if (roleError) return roleError;

    const { searchParams } = new URL(request.url);
    const contentItemId = searchParams.get("contentItemId");
    const campaignId = searchParams.get("campaignId") || undefined;
    const days = searchParams.get("days") ? parseInt(searchParams.get("days")!) : undefined;
    const view = searchParams.get("view") || "overall";

    if (contentItemId) {
      const performance = await getContentPerformance(contentItemId);
      return NextResponse.json({ success: true, data: performance });
    }

    if (view === "trends") {
      const trends = await analyzePerformanceTrends({ days });
      return NextResponse.json({ success: true, data: trends });
    }

    const overall = await getOverallPerformance({ campaignId, days });
    return NextResponse.json({ success: true, data: overall });
  } catch (error) {
    return handleApiError(error, "Content analytics GET");
  }
}
