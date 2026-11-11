import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { handleApiError, requireRole } from "@/lib/api-middleware";
import { batchRepurpose } from "@/lib/content-repurposer";
import type { RepurposeFormat } from "@/lib/content-repurposer";

export async function POST(request: Request) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const roleError = requireRole(user, ["super-admin", "admin", "manager"]);
    if (roleError) return roleError;

    const body = await request.json();
    const { campaignId, formats } = body;

    if (!campaignId || !formats || !Array.isArray(formats) || formats.length === 0) {
      return NextResponse.json(
        { error: "Missing required fields: campaignId, formats (non-empty array)" },
        { status: 400 }
      );
    }

    const validFormats: RepurposeFormat[] = [
      "twitter_thread",
      "linkedin_post",
      "facebook_post",
      "newsletter",
      "video_script",
      "infographic",
      "email_sequence",
      "podcast_script",
    ];

    const invalidFormats = formats.filter((f: string) => !validFormats.includes(f as RepurposeFormat));
    if (invalidFormats.length > 0) {
      return NextResponse.json(
        { error: `Invalid formats: ${invalidFormats.join(", ")}` },
        { status: 400 }
      );
    }

    const results = await batchRepurpose(campaignId, formats);

    const summary = results.map((r) => ({
      sourceItem: {
        _id: r.sourceItem._id,
        title: r.sourceItem.title,
      },
      generatedCount: r.generatedItems.length,
      generatedItems: r.generatedItems.map((item) => ({
        _id: item._id,
        title: item.title,
        type: item.type,
        platform: item.platform,
        status: item.status,
      })),
      summary: r.summary,
    }));

    return NextResponse.json({
      success: true,
      data: {
        results: summary,
        totalSources: results.length,
        totalGenerated: results.reduce((sum, r) => sum + r.generatedItems.length, 0),
      },
    });
  } catch (error) {
    return handleApiError(error, "Content batch repurpose POST");
  }
}
