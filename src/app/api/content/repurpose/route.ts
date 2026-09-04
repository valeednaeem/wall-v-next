import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { handleApiError, requireRole } from "@/lib/api-middleware";
import { repurposeContent, getRepurposeHistory } from "@/lib/content-repurposer";
import type { RepurposeFormat } from "@/lib/content-repurposer";

export async function GET(request: Request) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const contentItemId = searchParams.get("contentItemId");

    if (!contentItemId) {
      return NextResponse.json(
        { error: "Missing required query parameter: contentItemId" },
        { status: 400 }
      );
    }

    const history = await getRepurposeHistory(contentItemId);

    return NextResponse.json({ success: true, data: history });
  } catch (error) {
    return handleApiError(error, "Content repurpose GET");
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
    const { contentItemId, formats, brandVoice, targetAudience } = body;

    if (!contentItemId || !formats || !Array.isArray(formats) || formats.length === 0) {
      return NextResponse.json(
        { error: "Missing required fields: contentItemId, formats (non-empty array)" },
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

    const result = await repurposeContent(contentItemId, formats, {
      brandVoice,
      targetAudience,
    });

    return NextResponse.json({
      success: true,
      data: {
        sourceItem: {
          _id: result.sourceItem._id,
          title: result.sourceItem.title,
          type: result.sourceItem.type,
          platform: result.sourceItem.platform,
        },
        generatedItems: result.generatedItems.map((item) => ({
          _id: item._id,
          title: item.title,
          type: item.type,
          platform: item.platform,
          status: item.status,
          content: item.content,
          slug: item.slug,
          createdAt: item.createdAt,
        })),
        summary: result.summary,
      },
    });
  } catch (error) {
    return handleApiError(error, "Content repurpose POST");
  }
}
