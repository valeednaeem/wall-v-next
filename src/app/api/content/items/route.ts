import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { handleApiError, requireRole } from "@/lib/api-middleware";
import { connectToDatabase } from "@/lib/mongodb";
import ContentItem from "@/models/content-item";
import { createContentItem } from "@/lib/content-orchestrator";

export async function GET(request: Request) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectToDatabase();
    const { searchParams } = new URL(request.url);

    const campaignId = searchParams.get("campaignId");
    const planId = searchParams.get("planId");
    const topicId = searchParams.get("topicId");
    const type = searchParams.get("type");
    const platform = searchParams.get("platform");
    const status = searchParams.get("status");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");

    const query: Record<string, unknown> = {};
    if (campaignId) query.campaign = campaignId;
    if (planId) query.plan = planId;
    if (topicId) query.topic = topicId;
    if (type) query.type = type;
    if (platform) query.platform = platform;
    if (status) query.status = status;

    const total = await ContentItem.countDocuments(query);
    const items = await ContentItem.find(query)
      .populate("campaign", "name slug")
      .populate("topic", "title slug")
      .populate("plan", "weekNumber version")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    return NextResponse.json({
      success: true,
      data: items,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    return handleApiError(error, "Content items GET");
  }
}

export async function POST(request: Request) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const roleError = requireRole(user, ["super-admin", "admin", "manager"]);
    if (roleError) return roleError;

    const body = await request.json();

    if (!body.campaignId || !body.title || !body.type) {
      return NextResponse.json(
        { error: "Missing required fields: campaignId, title, type" },
        { status: 400 }
      );
    }

    const item = await createContentItem({
      campaignId: body.campaignId,
      topicId: body.topicId,
      type: body.type,
      platform: body.platform,
      title: body.title,
      content: body.content,
    });

    return NextResponse.json({ success: true, data: item }, { status: 201 });
  } catch (error) {
    return handleApiError(error, "Content items POST");
  }
}
