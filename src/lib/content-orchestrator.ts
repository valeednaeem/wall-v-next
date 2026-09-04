import { connectToDatabase } from "@/lib/mongodb";
import ContentCampaign from "@/models/content-campaign";
import ContentPlan from "@/models/content-plan";
import ContentTopic from "@/models/content-topic";
import ContentItem from "@/models/content-item";
import ContentSettings from "@/models/content-settings";
import type { IContentCampaign } from "@/models/content-campaign";
import type { IContentPlan } from "@/models/content-plan";
import type { IContentTopic } from "@/models/content-topic";
import type { IContentItem } from "@/models/content-item";
import { generateSlug } from "@/lib/generate-slug";
import { discoverTopics, scoreTopics, selectBestTopics } from "@/lib/topic-discovery";
import {
  generateArticle,
  generateSocialVariants,
  generateImagePrompt,
} from "@/lib/content-generator";

// ─── Campaign Management ─────────────────────────────────────────────────────

export async function createCampaign(data: {
  name: string;
  description?: string;
  businessObjectives: string[];
  targetAudience: string[];
  contentPillars: { name: string; description: string; keywords: string[] }[];
  dateRange: { start: string; end: string };
  productServicePriorities?: { type: string; name: string; slug: string; priority: number }[];
}): Promise<IContentCampaign> {
  await connectToDatabase();

  const slug = generateSlug(data.name);
  const existing = await ContentCampaign.findOne({ slug });
  if (existing) {
    throw new Error("Campaign with this name already exists");
  }

  const campaign = await ContentCampaign.create({
    name: data.name,
    slug,
    description: data.description,
    status: "draft",
    dateRange: {
      start: new Date(data.dateRange.start),
      end: new Date(data.dateRange.end),
    },
    businessObjectives: data.businessObjectives,
    targetAudience: data.targetAudience,
    contentPillars: data.contentPillars,
    productServicePriorities: data.productServicePriorities || [],
    planVersion: 1,
    completionPercentage: 0,
    stats: {
      totalTopics: 0,
      totalArticles: 0,
      totalPublished: 0,
      totalSocialPosts: 0,
      totalMediaAssets: 0,
      avgQualityScore: 0,
    },
    createdBy: "000000000000000000000000",
  });

  return campaign;
}

export async function getCampaign(campaignId: string): Promise<IContentCampaign> {
  await connectToDatabase();

  const campaign = await ContentCampaign.findById(campaignId)
    .populate("approvedBy", "name email")
    .populate("createdBy", "name email")
    .lean();

  if (!campaign) {
    throw new Error("Campaign not found");
  }

  return campaign as unknown as IContentCampaign;
}

export async function listCampaigns(status?: string): Promise<IContentCampaign[]> {
  await connectToDatabase();

  const query: Record<string, unknown> = {};
  if (status) {
    query.status = status;
  }

  const campaigns = await ContentCampaign.find(query)
    .populate("createdBy", "name email")
    .sort({ createdAt: -1 })
    .lean();

  return campaigns as unknown as IContentCampaign[];
}

// ─── Plan Management ─────────────────────────────────────────────────────────

export async function generateWeeklyPlan(
  campaignId: string,
  weekNumber: number,
  startDate: string,
  endDate: string
): Promise<IContentPlan> {
  await connectToDatabase();

  const campaign = await ContentCampaign.findById(campaignId).lean() as unknown as IContentCampaign | null;
  if (!campaign) {
    throw new Error("Campaign not found");
  }

  const topics = await discoverTopics(campaignId, {
    count: 14,
    focusAreas: campaign.contentPillars.map(
      (p: { name: string; description: string; keywords: string[] }) => p.name
    ),
    productServicePriorities: campaign.productServicePriorities.map(
      (p: { type: string; name: string; slug: string; priority: number }) => ({
        type: p.type,
        name: p.name,
      })
    ),
  });

  const scoredTopics = await scoreTopics(topics);
  const selectedTopics = await selectBestTopics(scoredTopics, 7);

  const topicDocs = await ContentTopic.insertMany(
    selectedTopics.map((t) => ({
      campaign: campaignId,
      title: t.title,
      slug: generateSlug(t.title),
      description: t.description,
      primaryKeyword: t.primaryKeyword,
      secondaryKeywords: t.secondaryKeywords,
      searchIntent: t.searchIntent,
      contentType: t.contentType as IContentTopic["contentType"],
      businessRelevance: t.businessRelevance,
      trendMomentum: t.trendMomentum,
      seoOpportunity: t.seoOpportunity,
      competition: t.competition,
      conversionPotential: t.conversionPotential,
      socialPotential: t.socialPotential,
      videoPotential: t.videoPotential,
      contentDifferentiation: 5,
      factualUncertainty: 5,
      saturation: 5,
      overallScore: t.overallScore || 0,
      sources: t.sources,
      status: "planned",
      assignedDayOfWeek: selectedTopics.indexOf(t),
      plannedChannels: ["blog", "linkedin"],
      plannedMedia: { image: true, video: false, social: true },
    }))
  );

  const dayOfWeekMap: Record<number, { dow: number; date: Date }> = {};
  const start = new Date(startDate);
  for (let i = 0; i < 7; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    dayOfWeekMap[i] = { dow: i, date: d };
  }

  for (let i = 0; i < topicDocs.length; i++) {
    const dow = i;
    if (dayOfWeekMap[dow]) {
      await ContentTopic.findByIdAndUpdate(topicDocs[i]._id, {
        assignedDate: dayOfWeekMap[dow].date,
        assignedDayOfWeek: dow,
      });
    }
  }

  const version = (campaign.planVersion || 0) + 1;
  await ContentCampaign.findByIdAndUpdate(campaignId, {
    status: "pending_approval",
    planVersion: version,
  });

  const plan = await ContentPlan.create({
    campaign: campaignId,
    weekNumber,
    startDate: new Date(startDate),
    endDate: new Date(endDate),
    version,
    status: "pending_approval",
    topics: topicDocs.map((t) => t._id),
    items: [],
    changeRequests: [],
    auditTrail: [
      {
        action: "plan_generated",
        timestamp: new Date(),
        actor: "000000000000000000000000",
        details: `Week ${weekNumber} plan generated with ${topicDocs.length} topics`,
      },
    ],
  });

  return plan;
}

export async function approvePlan(
  planId: string,
  userId: string
): Promise<IContentPlan> {
  await connectToDatabase();

  const plan = await ContentPlan.findById(planId).lean();
  if (!plan) {
    throw new Error("Plan not found");
  }

  if (plan.status !== "pending_approval" && plan.status !== "changes_requested") {
    throw new Error(`Cannot approve plan in status "${plan.status}". Must be "pending_approval" or "changes_requested".`);
  }

  const updated = await ContentPlan.findByIdAndUpdate(
    planId,
    {
      status: "approved",
      approvedBy: userId,
      approvedAt: new Date(),
      $push: {
        auditTrail: {
          action: "plan_approved",
          timestamp: new Date(),
          actor: userId,
          details: "Plan approved for execution",
        },
      },
    },
    { new: true }
  ).lean();

  await ContentCampaign.findByIdAndUpdate(plan.campaign, {
    status: "approved",
    approvedBy: userId,
    approvedAt: new Date(),
  });

  return updated as unknown as IContentPlan;
}

export async function rejectPlan(
  planId: string,
  userId: string,
  reason: string
): Promise<IContentPlan> {
  await connectToDatabase();

  const plan = await ContentPlan.findById(planId).lean();
  if (!plan) {
    throw new Error("Plan not found");
  }

  if (plan.status !== "pending_approval" && plan.status !== "changes_requested") {
    throw new Error(`Cannot reject plan in status "${plan.status}".`);
  }

  const updated = await ContentPlan.findByIdAndUpdate(
    planId,
    {
      status: "cancelled",
      rejectionReason: reason,
      $push: {
        auditTrail: {
          action: "plan_rejected",
          timestamp: new Date(),
          actor: userId,
          details: `Rejected: ${reason}`,
        },
      },
    },
    { new: true }
  ).lean();

  await ContentCampaign.findByIdAndUpdate(plan.campaign, {
    status: "rejected",
  });

  return updated as unknown as IContentPlan;
}

export async function requestPlanChanges(
  planId: string,
  userId: string,
  message: string
): Promise<IContentPlan> {
  await connectToDatabase();

  const plan = await ContentPlan.findById(planId).lean();
  if (!plan) {
    throw new Error("Plan not found");
  }

  if (plan.status !== "pending_approval" && plan.status !== "approved") {
    throw new Error(`Cannot request changes on plan in status "${plan.status}".`);
  }

  const updated = await ContentPlan.findByIdAndUpdate(
    planId,
    {
      status: "changes_requested",
      $push: {
        changeRequests: {
          message,
          requestedBy: userId,
          requestedAt: new Date(),
        },
        auditTrail: {
          action: "changes_requested",
          timestamp: new Date(),
          actor: userId,
          details: message,
        },
      },
    },
    { new: true }
  ).lean();

  await ContentCampaign.findByIdAndUpdate(plan.campaign, {
    status: "changes_requested",
  });

  return updated as unknown as IContentPlan;
}

export async function pauseCampaign(
  campaignId: string
): Promise<IContentCampaign> {
  await connectToDatabase();

  const campaign = await ContentCampaign.findById(campaignId).lean();
  if (!campaign) {
    throw new Error("Campaign not found");
  }

  const activeStatuses = ["approved", "executing", "partially_completed", "planned"];
  if (!activeStatuses.includes(campaign.status)) {
    throw new Error(`Cannot pause campaign in status "${campaign.status}".`);
  }

  const updated = await ContentCampaign.findByIdAndUpdate(
    campaignId,
    {
      status: "paused",
      pausedAt: new Date(),
    },
    { new: true }
  ).lean();

  return updated as unknown as IContentCampaign;
}

export async function cancelCampaign(
  campaignId: string
): Promise<IContentCampaign> {
  await connectToDatabase();

  const campaign = await ContentCampaign.findById(campaignId).lean();
  if (!campaign) {
    throw new Error("Campaign not found");
  }

  if (campaign.status === "completed" || campaign.status === "cancelled") {
    throw new Error(`Cannot cancel campaign in status "${campaign.status}".`);
  }

  const updated = await ContentCampaign.findByIdAndUpdate(
    campaignId,
    {
      status: "cancelled",
      cancelledAt: new Date(),
    },
    { new: true }
  ).lean();

  return updated as unknown as IContentCampaign;
}

// ─── Execution ───────────────────────────────────────────────────────────────

export async function executePlan(
  planId: string
): Promise<{ itemsCreated: number; errors: string[] }> {
  await connectToDatabase();

  const plan = await ContentPlan.findById(planId).lean() as unknown as IContentPlan | null;
  if (!plan) {
    throw new Error("Plan not found");
  }

  if (plan.status !== "approved") {
    throw new Error(`Plan must be approved before execution. Current status: "${plan.status}".`);
  }

  await ContentPlan.findByIdAndUpdate(planId, {
    status: "executing",
    $push: {
      auditTrail: {
        action: "execution_started",
        timestamp: new Date(),
        actor: "000000000000000000000000",
        details: "Plan execution initiated",
      },
    },
  });

  await ContentCampaign.findByIdAndUpdate(plan.campaign, {
    status: "executing",
  });

  let itemsCreated = 0;
  const errors: string[] = [];

  for (const topicId of plan.topics) {
    try {
      const topic = await ContentTopic.findById(topicId).lean() as unknown as IContentTopic | null;
      if (!topic) {
        errors.push(`Topic ${topicId} not found`);
        continue;
      }

      const campaign = await ContentCampaign.findById(plan.campaign).lean() as unknown as IContentCampaign | null;
      if (!campaign) {
        errors.push("Campaign not found");
        break;
      }

      const articleItem = await ContentItem.create({
        campaign: plan.campaign,
        plan: planId,
        topic: topicId,
        type: "article",
        platform: "blog",
        title: topic.title,
        slug: generateSlug(topic.title),
        status: "draft",
        approvalRequired: true,
      });

      const articleData = await generateArticle(articleItem, topic, campaign);
      await ContentItem.findByIdAndUpdate(articleItem._id, {
        content: articleData.content,
        excerpt: articleData.excerpt,
        seo: articleData.seo,
        internalLinks: articleData.internalLinks,
        status: "review",
      });

      const socials = await generateSocialVariants(
        { ...articleItem.toObject(), ...articleData } as IContentItem,
        ["linkedin", "facebook", "instagram", "x"]
      );

      const socialItems = await Promise.all(
        socials.map(async (s) => {
          return ContentItem.create({
            campaign: plan.campaign,
            plan: planId,
            topic: topicId,
            type: "social_post",
            platform: s.platform as IContentItem["platform"],
            title: `${topic.title} - ${s.platform}`,
            content: s.content,
            slug: generateSlug(`${topic.title}-${s.platform}`),
            status: "draft",
            approvalRequired: true,
          });
        })
      );

      const heroPrompt = await generateImagePrompt(
        articleItem as unknown as IContentItem,
        "hero"
      );
      await ContentItem.findByIdAndUpdate(articleItem._id, {
        featuredImage: heroPrompt,
      });

      itemsCreated += 1 + socialItems.length;
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      errors.push(`Topic ${topicId}: ${msg}`);
    }
  }

  const finalStatus = errors.length === 0 ? "completed" : "partially_completed";
  await ContentPlan.findByIdAndUpdate(planId, {
    status: finalStatus,
    $push: {
      auditTrail: {
        action: "execution_completed",
        timestamp: new Date(),
        actor: "000000000000000000000000",
        details: `Created ${itemsCreated} items. ${errors.length} errors.`,
      },
    },
  });

  await ContentCampaign.findByIdAndUpdate(plan.campaign, {
    status: finalStatus,
    $inc: {
      "stats.totalArticles": itemsCreated,
    },
  });

  return { itemsCreated, errors };
}

// ─── Content Item Management ─────────────────────────────────────────────────

export async function createContentItem(data: {
  campaignId: string;
  topicId?: string;
  type: "article" | "social_post" | "video_script" | "carousel" | "newsletter";
  platform?: string;
  title: string;
  content?: string;
}): Promise<IContentItem> {
  await connectToDatabase();

  const slug = generateSlug(data.title);
  const existing = await ContentItem.findOne({ slug, campaign: data.campaignId });
  if (existing) {
    throw new Error("Content item with this title already exists in this campaign");
  }

  const item = await ContentItem.create({
    campaign: data.campaignId,
    topic: data.topicId || undefined,
    type: data.type,
    platform: data.platform || undefined,
    title: data.title,
    slug,
    content: data.content || undefined,
    status: "draft",
    approvalRequired: true,
  });

  return item;
}

export async function updateContentItem(
  itemId: string,
  updates: Partial<IContentItem>
): Promise<IContentItem> {
  await connectToDatabase();

  const item = await ContentItem.findByIdAndUpdate(itemId, updates, {
    new: true,
  }).lean();

  if (!item) {
    throw new Error("Content item not found");
  }

  return item as unknown as IContentItem;
}

export async function approveContentItem(
  itemId: string,
  userId: string
): Promise<IContentItem> {
  await connectToDatabase();

  const item = await ContentItem.findById(itemId).lean();
  if (!item) {
    throw new Error("Content item not found");
  }

  if (item.status !== "review" && item.status !== "fact_check" && item.status !== "seo_review" && item.status !== "brand_review") {
    throw new Error(`Cannot approve item in status "${item.status}".`);
  }

  const updated = await ContentItem.findByIdAndUpdate(
    itemId,
    {
      status: "approved",
      approvedBy: userId,
      approvedAt: new Date(),
    },
    { new: true }
  ).lean();

  return updated as unknown as IContentItem;
}

export async function publishContentItem(
  itemId: string
): Promise<IContentItem> {
  await connectToDatabase();

  const item = await ContentItem.findById(itemId).lean();
  if (!item) {
    throw new Error("Content item not found");
  }

  if (item.status !== "approved" && item.status !== "scheduled") {
    throw new Error(`Cannot publish item in status "${item.status}". Must be "approved" or "scheduled".`);
  }

  const updated = await ContentItem.findByIdAndUpdate(
    itemId,
    {
      status: "published",
      publishedAt: new Date(),
    },
    { new: true }
  ).lean();

  if (updated && item.type === "article") {
    await ContentCampaign.findByIdAndUpdate(item.campaign, {
      $inc: { "stats.totalPublished": 1 },
    });
  }

  if (updated && item.type === "social_post") {
    await ContentCampaign.findByIdAndUpdate(item.campaign, {
      $inc: { "stats.totalSocialPosts": 1 },
    });
  }

  return updated as unknown as IContentItem;
}

// ─── Settings ────────────────────────────────────────────────────────────────

export async function getContentSettings(
  category?: string
): Promise<Record<string, unknown>> {
  await connectToDatabase();

  const query: Record<string, unknown> = {};
  if (category) {
    query.category = category;
  }

  const settings = await ContentSettings.find(query).lean();

  const result: Record<string, unknown> = {};
  for (const setting of settings) {
    result[setting.key] = setting.value;
  }

  return result;
}

export async function updateContentSetting(
  key: string,
  value: unknown,
  category: string
): Promise<void> {
  await connectToDatabase();

  await ContentSettings.findOneAndUpdate(
    { key, category },
    { key, value, category },
    { upsert: true, new: true }
  );
}
