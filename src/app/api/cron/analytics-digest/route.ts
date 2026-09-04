import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import Notification from "@/models/notification";
import User from "@/models/user";
import {
  getOverallPerformance,
  analyzePerformanceTrends,
  detectContentDecay,
} from "@/lib/content-analytics";

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await connectToDatabase();

    const [performance, trends, decayReports] = await Promise.all([
      getOverallPerformance({ days: 7 }),
      analyzePerformanceTrends({ days: 7 }),
      detectContentDecay({ daysSincePublish: 90, viewThreshold: 50 }),
    ]);

    const summaryLines: string[] = [];

    summaryLines.push(`Total views (7d): ${performance.totalViews}`);
    summaryLines.push(`Published articles: ${performance.totalPublished}`);

    if (performance.topPerforming.length > 0) {
      const top = performance.topPerforming[0];
      summaryLines.push(`Top content: "${top.title}" (${top.views} views)`);
    }

    if (trends.recommendations.length > 0) {
      summaryLines.push(`Recommendation: ${trends.recommendations[0]}`);
    }

    if (decayReports.length > 0) {
      summaryLines.push(`Content decay signals: ${decayReports.length} pieces need attention`);
    }

    const digestMessage = summaryLines.join("\n");

    const superAdmins = await User.find({ role: "super-admin" })
      .select("_id")
      .lean();

    for (const admin of superAdmins) {
      await Notification.create({
        user: admin._id,
        title: "Weekly Analytics Digest",
        message: digestMessage,
        type: "info",
        link: "/dashboard/content/analytics",
      });
    }

    return NextResponse.json({
      success: true,
      performance: {
        totalViews: performance.totalViews,
        totalPublished: performance.totalPublished,
        topPerforming: performance.topPerforming.slice(0, 3),
      },
      trends: {
        recommendations: trends.recommendations.slice(0, 3),
        bestPlatforms: trends.bestPlatforms.slice(0, 3),
      },
      decayCount: decayReports.length,
      notificationsSent: superAdmins.length,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Execution failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
