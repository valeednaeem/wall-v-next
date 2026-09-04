import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import ContentCampaign from "@/models/content-campaign";
import ContentPlan from "@/models/content-plan";
import Notification from "@/models/notification";
import { generateWeeklyPlan } from "@/lib/content-orchestrator";
import type { IContentCampaign } from "@/models/content-campaign";

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await connectToDatabase();

    const activeStatuses = ["approved", "executing", "partially_completed"];
    const campaigns = await ContentCampaign.find({
      status: { $in: activeStatuses },
    }).lean();

    const results: {
      campaignId: string;
      campaignName: string;
      planId: string | null;
      action: string;
      error?: string;
    }[] = [];

    for (const campaign of campaigns) {
      const c = campaign as unknown as IContentCampaign;
      try {
        const now = new Date();
        const nextWeekStart = new Date(now);
        nextWeekStart.setDate(now.getDate() + (7 - now.getDay()));
        nextWeekStart.setHours(0, 0, 0, 0);

        const nextWeekEnd = new Date(nextWeekStart);
        nextWeekEnd.setDate(nextWeekStart.getDate() + 6);
        nextWeekEnd.setHours(23, 59, 59, 999);

        const existingPlan = await ContentPlan.findOne({
          campaign: c._id,
          startDate: { $lte: nextWeekEnd },
          endDate: { $gte: nextWeekStart },
          status: { $in: ["draft", "pending_approval", "approved", "executing"] },
        }).lean();

        if (existingPlan) {
          results.push({
            campaignId: c._id.toString(),
            campaignName: c.name,
            planId: existingPlan._id.toString(),
            action: "skipped",
          });
          continue;
        }

        const lastPlan = await ContentPlan.findOne({ campaign: c._id })
          .sort({ weekNumber: -1 })
          .lean();
        const nextWeekNumber = (lastPlan?.weekNumber || 0) + 1;

        const plan = await generateWeeklyPlan(
          c._id.toString(),
          nextWeekNumber,
          nextWeekStart.toISOString().split("T")[0],
          nextWeekEnd.toISOString().split("T")[0]
        );

        results.push({
          campaignId: c._id.toString(),
          campaignName: c.name,
          planId: plan._id.toString(),
          action: "created",
        });
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Unknown error";
        results.push({
          campaignId: c._id.toString(),
          campaignName: c.name,
          planId: null,
          action: "error",
          error: msg,
        });
      }
    }

    const createdCount = results.filter((r) => r.action === "created").length;
    const errorCount = results.filter((r) => r.action === "error").length;

    if (createdCount > 0) {
      const superAdmins = await import("@/models/user").then((m) =>
        m.default.find({ role: "super-admin" }).select("_id").lean()
      );

      for (const admin of superAdmins) {
        await Notification.create({
          user: admin._id,
          title: "Weekly Content Plans Generated",
          message: `${createdCount} new content plan(s) created for the upcoming week. ${errorCount > 0 ? `${errorCount} errors occurred.` : ""}`,
          type: createdCount > 0 ? "success" : "warning",
          link: "/dashboard/content/plans",
        });
      }
    }

    return NextResponse.json({ success: true, results });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Execution failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
