import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { handleApiError, CONTENT_ROLES } from "@/lib/api-middleware";
import { connectToDatabase } from "@/lib/mongodb";
import ContentItem from "@/models/content-item";
import { enqueuePublication } from "@/lib/social-publisher/enqueue";
import { contentItemPayload } from "@/lib/social-publisher/payloads";
import { normalizePlatform } from "@/lib/social-publisher/platforms";

const SUPPORTED_PLATFORMS = ["linkedin", "facebook", "x", "instagram", "tiktok", "youtube"];

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!CONTENT_ROLES.includes(user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await connectToDatabase();

    const body = await request.json();
    const { contentItemId, platforms } = body as {
      contentItemId: string;
      platforms: string[];
    };

    if (!contentItemId || !Array.isArray(platforms) || platforms.length === 0) {
      return NextResponse.json(
        { error: "contentItemId and platforms[] are required" },
        { status: 400 }
      );
    }

    const invalidPlatforms = platforms.filter(
      (p) => !SUPPORTED_PLATFORMS.includes(p)
    );
    if (invalidPlatforms.length > 0) {
      return NextResponse.json(
        { error: `Unsupported platforms: ${invalidPlatforms.join(", ")}` },
        { status: 400 }
      );
    }

    const item = await ContentItem.findById(contentItemId).lean();
    if (!item) {
      return NextResponse.json(
        { error: "Content item not found" },
        { status: 404 }
      );
    }

    const payload = contentItemPayload(item);
    payload.relatedContentItem = contentItemId;

    const normalizedPlatforms = Array.from(
      new Set(
        platforms
          .map((p) => normalizePlatform(p))
          .filter((p): p is string => p !== null)
      )
    );

    const result = await enqueuePublication({
      type: "published",
      contentType: "content-item",
      contentId: contentItemId,
      payload,
      platforms: normalizedPlatforms,
      actorId: user.userId,
    });

    if (result.eventId === null && result.created === 0) {
      return NextResponse.json(
        { error: "Failed to enqueue publication" },
        { status: 500 }
      );
    }

    // Only flip to "publishing" when new jobs were actually enqueued —
    // otherwise we would clobber a terminal state (failed/cancelled) that the
    // worker's status sync owns.
    if (result.created > 0) {
      await ContentItem.findByIdAndUpdate(contentItemId, {
        status: "publishing",
      });
    }

    return NextResponse.json({
      success: true,
      enqueued: true,
      contentItemId,
      platforms: normalizedPlatforms,
      jobsCreated: result.created,
      jobsExisting: result.existing,
      skippedReason: result.skippedReason,
    });
  } catch (error) {
    return handleApiError(error, "Content publish");
  }
}
