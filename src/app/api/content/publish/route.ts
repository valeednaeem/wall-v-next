import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { handleApiError, CONTENT_ROLES } from "@/lib/api-middleware";
import { connectToDatabase } from "@/lib/mongodb";
import ContentItem from "@/models/content-item";
import ContentDistribution from "@/models/content-distribution";
import { getAdapter } from "@/lib/social-adapters";
import type { SocialPost } from "@/lib/social-adapters";

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

    interface SocialVariant {
      platform: string;
      content: string;
      hashtags?: string[];
    }
    const socialVariant = (item.socialVariants as SocialVariant[] | undefined)?.find(
      (v) => platforms.includes(v.platform)
    );

    const post: SocialPost = {
      content: socialVariant?.content || item.content || item.title,
      hashtags: socialVariant?.hashtags,
      imageUrl: item.featuredImage,
      title: item.title,
      description: item.excerpt,
    };

    interface PublishRecord {
      success: boolean;
      requiresAuth?: boolean;
      distributionId: string;
    }
    const results: Record<string, PublishRecord> = {};
    const distributionIds: string[] = [];

    for (const platform of platforms) {
      const distribution = await ContentDistribution.create({
        contentItem: item._id,
        platform,
        status: "publishing",
        approvalRequired: item.approvalRequired,
        approvedBy: item.approvedBy,
        approvedAt: item.approvedAt,
      });
      distributionIds.push(distribution._id.toString());

      const adapter = getAdapter(platform);
      const isConnected = await adapter.isConnected();

      if (!isConnected) {
        await ContentDistribution.findByIdAndUpdate(distribution._id, {
          status: "requires_auth",
          error: `Platform ${platform} is not connected`,
        });
        results[platform] = {
          success: false,
          requiresAuth: true,
          distributionId: distribution._id.toString(),
        };
        continue;
      }

      const publishResult = await adapter.publish(post);

      const updateFields: Record<string, unknown> = {
        status: publishResult.success ? "published" : "failed",
        response: publishResult,
      };
      if (publishResult.platformPostId) {
        updateFields.platformPostId = publishResult.platformPostId;
      }
      if (publishResult.platformUrl) {
        updateFields.platformUrl = publishResult.platformUrl;
      }
      if (publishResult.publishedAt) {
        updateFields.publishedAt = publishResult.publishedAt;
      }
      if (publishResult.error) {
        updateFields.error = publishResult.error;
      }

      await ContentDistribution.findByIdAndUpdate(
        distribution._id,
        updateFields
      );

      results[platform] = {
        ...publishResult,
        distributionId: distribution._id.toString(),
      };
    }

    await ContentItem.findByIdAndUpdate(contentItemId, {
      $addToSet: { distribution: { $each: distributionIds } },
    });

    const resultValues = Object.values(results) as PublishRecord[];
    const allFailed = resultValues.every((r) => !r.success);
    const allSuccess = resultValues.every((r) => r.success);

    if (allSuccess) {
      await ContentItem.findByIdAndUpdate(contentItemId, {
        status: "published",
        publishedAt: new Date(),
      });
    } else if (allFailed) {
      await ContentItem.findByIdAndUpdate(contentItemId, {
        status: "failed",
      });
    } else {
      await ContentItem.findByIdAndUpdate(contentItemId, {
        status: "publishing",
      });
    }

    return NextResponse.json({
      success: true,
      contentItemId,
      results,
    });
  } catch (error) {
    return handleApiError(error, "Content publish");
  }
}
