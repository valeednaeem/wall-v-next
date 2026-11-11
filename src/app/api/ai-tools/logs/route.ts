import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import ActivityLog from "@/models/activity-log";
import { getAuthUser } from "@/lib/auth";
import { PERMISSIONS, hasPermission } from "@/lib/permissions";
import { handleApiError } from "@/lib/api-middleware";

export async function GET(request: Request) {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!hasPermission(user.permissions || [], PERMISSIONS.AI_TOOLS_VIEW)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(100, parseInt(searchParams.get("limit") || "50", 10));

    await connectToDatabase();
    const filter = { entity: { $in: ["AITool", "AIToolCategory", "AIToolProvider", "AIToolPlan", "AIToolReport", "MarketResearch"] } };
    const [data, total] = await Promise.all([
      ActivityLog.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
      ActivityLog.countDocuments(filter),
    ]);

    return NextResponse.json({
      success: true,
      data,
      pagination: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) },
    });
  } catch (error) {
    return handleApiError(error, "ai-tools logs GET");
  }
}
