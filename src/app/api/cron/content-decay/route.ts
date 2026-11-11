import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import ContentItem from "@/models/content-item";
import Notification from "@/models/notification";
import { detectContentDecay } from "@/lib/content-analytics";
import type { IContentItem } from "@/models/content-item";

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await connectToDatabase();

    const decayReports = await detectContentDecay({
      daysSincePublish: 90,
      viewThreshold: 50,
    });

    let itemsCreated = 0;
    const errors: string[] = [];

    for (const report of decayReports) {
      try {
        if (report.recommendedAction === "monitor") continue;

        const existingItem = await ContentItem.findOne({
          relatedContentItem: report.contentItemId,
          type: "update",
          status: { $in: ["draft", "review"] },
        }).lean();

        if (existingItem) continue;

        const originalItem = await ContentItem.findById(report.contentItemId)
          .select("campaign title platform")
          .lean() as unknown as IContentItem | null;

        if (!originalItem) continue;

        await ContentItem.create({
          campaign: originalItem.campaign,
          relatedContentItem: report.contentItemId,
          type: "update",
          platform: originalItem.platform,
          title: `[Decay] ${originalItem.title}`,
          content: report.reasons.join("\n"),
          status: "draft",
          approvalRequired: true,
          qualityScores: {
            decayScore: report.decayScore,
            recommendedAction: report.recommendedAction,
          },
        });

        itemsCreated++;
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Unknown error";
        errors.push(`${report.title}: ${msg}`);
      }
    }

    if (decayReports.length > 0) {
      const superAdmins = await import("@/models/user").then((m) =>
        m.default.find({ role: "super-admin" }).select("_id").lean()
      );

      for (const admin of superAdmins) {
        await Notification.create({
          user: admin._id,
          title: "Content Decay Report",
          message: `${decayReports.length} content pieces show decay signals. ${itemsCreated} update drafts created.`,
          type: itemsCreated > 0 ? "warning" : "info",
          link: "/dashboard/content/items",
        });
      }
    }

    return NextResponse.json({
      success: true,
      decayDetected: decayReports.length,
      updateDraftsCreated: itemsCreated,
      errors,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Execution failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
