import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { handleApiError, requireRole } from "@/lib/api-middleware";
import { connectToDatabase } from "@/lib/mongodb";
import ContentTopic from "@/models/content-topic";
import { generateSlug } from "@/lib/generate-slug";

export async function GET(request: Request) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectToDatabase();
    const { searchParams } = new URL(request.url);

    const campaignId = searchParams.get("campaignId");
    const status = searchParams.get("status");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");

    const query: Record<string, unknown> = {};
    if (campaignId) query.campaign = campaignId;
    if (status) query.status = status;

    const total = await ContentTopic.countDocuments(query);
    const topics = await ContentTopic.find(query)
      .populate("campaign", "name slug")
      .sort({ overallScore: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    return NextResponse.json({
      success: true,
      data: topics,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    return handleApiError(error, "Topics GET");
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

    await connectToDatabase();
    const body = await request.json();

    if (!body.title || !body.campaignId) {
      return NextResponse.json(
        { error: "Missing required fields: title, campaignId" },
        { status: 400 }
      );
    }

    const slug = generateSlug(body.title);
    const existing = await ContentTopic.findOne({ slug, campaign: body.campaignId });
    if (existing) {
      return NextResponse.json(
        { error: "Topic with this title already exists in this campaign" },
        { status: 409 }
      );
    }

    const topic = await ContentTopic.create({
      campaign: body.campaignId,
      title: body.title,
      slug,
      description: body.description,
      primaryKeyword: body.primaryKeyword,
      secondaryKeywords: body.secondaryKeywords || [],
      searchIntent: body.searchIntent || "informational",
      contentType: body.contentType || "guide",
      businessRelevance: body.businessRelevance || 5,
      trendMomentum: body.trendMomentum || 5,
      seoOpportunity: body.seoOpportunity || 5,
      competition: body.competition || 5,
      conversionPotential: body.conversionPotential || 5,
      socialPotential: body.socialPotential || 5,
      videoPotential: body.videoPotential || 5,
      contentDifferentiation: body.contentDifferentiation || 5,
      factualUncertainty: body.factualUncertainty || 5,
      saturation: body.saturation || 5,
      overallScore: body.overallScore || 0,
      sources: body.sources || [],
      competitorAngles: body.competitorAngles || [],
      status: body.status || "discovered",
      plannedChannels: body.plannedChannels || [],
      plannedMedia: body.plannedMedia || { image: false, video: false, social: false },
    });

    return NextResponse.json({ success: true, data: topic }, { status: 201 });
  } catch (error) {
    return handleApiError(error, "Topics POST");
  }
}
