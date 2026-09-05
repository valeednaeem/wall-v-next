import { connectToDatabase } from "@/lib/mongodb";
import ContentCampaign from "@/models/content-campaign";
import ContentPlan from "@/models/content-plan";
import ContentItem from "@/models/content-item";
import ContentTopic from "@/models/content-topic";
import ContentSettings from "@/models/content-settings";
import type { IContentCampaign } from "@/models/content-campaign";
import type { IContentPlan } from "@/models/content-plan";
import type { IContentItem } from "@/models/content-item";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface PendingExecution {
  planId: string;
  campaignId: string;
  campaignName: string;
  planWeek: number;
  draftItems: number;
  scheduledDate: Date;
}

export interface DailyExecutionResult {
  executed: number;
  published: number;
  pendingApproval: number;
  errors: string[];
  details: {
    planId: string;
    campaignName: string;
    itemsProcessed: number;
    itemsPublished: number;
    errors: string[];
  }[];
}

export interface ScheduledContent {
  date: string;
  items: {
    _id: string;
    title: string;
    type: string;
    platform?: string;
    status: string;
    scheduledAt: Date;
  }[];
}

// ─── Check Pending Executions ────────────────────────────────────────────────

export async function checkPendingExecutions(): Promise<PendingExecution[]> {
  await connectToDatabase();

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const approvedPlans = await ContentPlan.find({ status: "approved" })
    .populate("campaign")
    .lean();

  const results: PendingExecution[] = [];

  for (const plan of approvedPlans) {
    const campaign = plan.campaign as unknown as IContentCampaign | null;
    if (!campaign) continue;

    const activeStatuses = ["approved", "executing", "partially_completed"];
    if (!activeStatuses.includes(campaign.status)) continue;

    const draftItems = await ContentItem.countDocuments({
      plan: plan._id,
      status: "draft",
    });

    if (draftItems === 0) continue;

    const hasScheduledToday = await ContentItem.findOne({
      plan: plan._id,
      scheduledAt: { $gte: today, $lt: tomorrow },
    }).lean();

    results.push({
      planId: plan._id.toString(),
      campaignId: campaign._id.toString(),
      campaignName: campaign.name,
      planWeek: plan.weekNumber,
      draftItems,
      scheduledDate: hasScheduledToday?.scheduledAt || today,
    });
  }

  return results;
}

// ─── Execute Daily Content ───────────────────────────────────────────────────

export async function executeDailyContent(): Promise<DailyExecutionResult> {
  await connectToDatabase();

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const result: DailyExecutionResult = {
    executed: 0,
    published: 0,
    pendingApproval: 0,
    errors: [],
    details: [],
  };

  const approvedPlans = await ContentPlan.find({ status: "approved" })
    .populate("campaign")
    .lean();

  // Read publishingMode from ContentSettings
  const contentSettings = await ContentSettings.findOne({ key: "content" }).lean();
  const publishingMode = (contentSettings?.value as Record<string, unknown>)?.publishingMode as string || "review";

  for (const plan of approvedPlans) {
    const campaign = plan.campaign as unknown as IContentCampaign | null;
    if (!campaign) continue;

    const detail = {
      planId: plan._id.toString(),
      campaignName: campaign.name,
      itemsProcessed: 0,
      itemsPublished: 0,
      errors: [] as string[],
    };

    try {
      const preconditions = await validateExecutionPreconditions(plan._id.toString());
      if (!preconditions.valid) {
        detail.errors.push(`Preconditions failed: ${preconditions.reasons.join(", ")}`);
        result.errors.push(`${campaign.name}: ${preconditions.reasons.join(", ")}`);
        result.details.push(detail);
        continue;
      }

      const draftItems = await ContentItem.find({
        plan: plan._id,
        status: "draft",
      }).lean();

      for (const item of draftItems) {
        try {
          const contentItem = item as unknown as IContentItem;

          // Determine status based on publishingMode
          const targetStatus = publishingMode === "auto" ? "approved" : "review";

          await ContentItem.findByIdAndUpdate(item._id, {
            status: targetStatus,
            $push: {
              revisions: {
                content: contentItem.content || "",
                revisedAt: new Date(),
                revisedBy: "000000000000000000000000",
                reason: publishingMode === "auto"
                  ? "Automated daily execution — auto-publish mode"
                  : "Automated daily execution — moved to review",
              },
            },
          });

          detail.itemsProcessed++;
          result.executed++;

          if (publishingMode === "auto") {
            // Auto mode: approve and schedule immediately
            await ContentItem.findByIdAndUpdate(item._id, {
              status: "approved",
              approvedAt: new Date(),
              approvedBy: "000000000000000000000000",
            });

            await ContentItem.findByIdAndUpdate(item._id, {
              status: "scheduled",
              scheduledAt: today,
            });

            detail.itemsPublished++;
            result.published++;
          } else if (publishingMode === "hybrid") {
            // Hybrid mode: auto-approve if no approval required, otherwise review
            if (!contentItem.approvalRequired) {
              await ContentItem.findByIdAndUpdate(item._id, {
                status: "approved",
                approvedAt: new Date(),
                approvedBy: "000000000000000000000000",
              });

              await ContentItem.findByIdAndUpdate(item._id, {
                status: "scheduled",
                scheduledAt: today,
              });

              detail.itemsPublished++;
              result.published++;
            } else {
              result.pendingApproval++;
            }
          } else {
            // Review mode (default): always require human review
            result.pendingApproval++;
          }
        } catch (err) {
          const msg = err instanceof Error ? err.message : "Unknown error";
          detail.errors.push(`Item ${item._id}: ${msg}`);
          result.errors.push(`${campaign.name} — Item ${item._id}: ${msg}`);
        }
      }

      if (detail.itemsProcessed > 0) {
        await ContentPlan.findByIdAndUpdate(plan._id, {
          $push: {
            auditTrail: {
              action: "daily_execution",
              timestamp: new Date(),
              actor: "000000000000000000000000",
              details: `Processed ${detail.itemsProcessed} items, ${detail.itemsPublished} auto-published`,
            },
          },
        });

        await ContentCampaign.findByIdAndUpdate(campaign._id, {
          status: "executing",
        });
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      detail.errors.push(msg);
      result.errors.push(`${campaign.name}: ${msg}`);
    }

    result.details.push(detail);
  }

  return result;
}

// ─── Validate Execution Preconditions ────────────────────────────────────────

export async function validateExecutionPreconditions(
  planId: string
): Promise<{ valid: boolean; reasons: string[] }> {
  await connectToDatabase();

  const reasons: string[] = [];

  const plan = await ContentPlan.findById(planId).lean() as unknown as IContentPlan | null;
  if (!plan) {
    return { valid: false, reasons: ["Plan not found"] };
  }

  if (plan.status !== "approved") {
    reasons.push(`Plan status is "${plan.status}", expected "approved"`);
  }

  const campaign = await ContentCampaign.findById(plan.campaign).lean() as unknown as IContentCampaign | null;
  if (!campaign) {
    reasons.push("Campaign not found");
    return { valid: false, reasons };
  }

  const inactiveStatuses = ["paused", "cancelled", "completed", "rejected", "failed"];
  if (inactiveStatuses.includes(campaign.status)) {
    reasons.push(`Campaign is ${campaign.status}`);
  }

  const activePlans = await ContentPlan.find({
    campaign: plan.campaign,
    status: "executing",
    _id: { $ne: planId },
  }).lean();

  if (activePlans.length > 0) {
    reasons.push("Another plan is currently executing for this campaign");
  }

  const topicIds = plan.topics;
  if (topicIds.length > 0) {
    const staleTopics = await ContentTopic.countDocuments({
      _id: { $in: topicIds },
      updatedAt: { $lt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
    });

    if (staleTopics > topicIds.length * 0.5) {
      reasons.push(`${staleTopics} of ${topicIds.length} topics may be stale (>30 days old)`);
    }
  }

  return { valid: reasons.length === 0, reasons };
}

// ─── Schedule Content ────────────────────────────────────────────────────────

export async function scheduleContent(
  contentItemId: string,
  scheduledAt: Date
): Promise<void> {
  await connectToDatabase();

  const item = await ContentItem.findById(contentItemId).lean() as unknown as IContentItem | null;
  if (!item) {
    throw new Error("Content item not found");
  }

  if (scheduledAt <= new Date()) {
    throw new Error("Scheduled time must be in the future");
  }

  if (item.status !== "approved" && item.status !== "draft") {
    throw new Error(`Cannot schedule item in status "${item.status}". Must be "approved" or "draft".`);
  }

  await ContentItem.findByIdAndUpdate(contentItemId, {
    status: "scheduled",
    scheduledAt,
    $push: {
      revisions: {
        content: item.content || "",
        revisedAt: new Date(),
        revisedBy: "000000000000000000000000",
        reason: `Scheduled for ${scheduledAt.toISOString()}`,
      },
    },
  });
}

// ─── Get Upcoming Schedule ───────────────────────────────────────────────────

export async function getUpcomingSchedule(
  days = 7
): Promise<ScheduledContent[]> {
  await connectToDatabase();

  const now = new Date();
  const endDate = new Date(now);
  endDate.setDate(endDate.getDate() + days);

  const items = await ContentItem.find({
    scheduledAt: { $gte: now, $lte: endDate },
    status: { $in: ["scheduled", "approved", "publishing"] },
  })
    .select("title type platform status scheduledAt")
    .sort({ scheduledAt: 1 })
    .lean();

  const grouped: Record<string, ScheduledContent["items"]> = {};

  for (const item of items) {
    const dateKey = new Date(item.scheduledAt!).toISOString().split("T")[0];
    if (!grouped[dateKey]) {
      grouped[dateKey] = [];
    }
    grouped[dateKey].push({
      _id: item._id.toString(),
      title: item.title,
      type: item.type,
      platform: item.platform,
      status: item.status,
      scheduledAt: item.scheduledAt!,
    });
  }

  return Object.entries(grouped)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, dayItems]) => ({
      date,
      items: dayItems,
    }));
}
