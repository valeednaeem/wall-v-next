import { connectToDatabase } from "@/lib/mongodb";
import type { AgentToolDefinition } from "@/lib/agent-tools";

// ─── Content Agent Tool Definitions ──────────────────────────────────────────

export const CONTENT_TOOL_DEFINITIONS: AgentToolDefinition[] = [
  {
    type: "function",
    function: {
      name: "create_content_campaign",
      description: "Create a new content campaign with business objectives and content pillars",
      parameters: {
        type: "object",
        properties: {
          name: { type: "string", description: "Campaign name" },
          description: { type: "string", description: "Campaign description" },
          businessObjectives: {
            type: "array",
            items: { type: "string" },
            description: "Business objectives for this campaign",
          },
          targetAudience: {
            type: "array",
            items: { type: "string" },
            description: "Target audience segments",
          },
          startDate: { type: "string", description: "Campaign start date (ISO)" },
          endDate: { type: "string", description: "Campaign end date (ISO)" },
        },
        required: ["name", "businessObjectives", "targetAudience", "startDate", "endDate"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "generate_weekly_plan",
      description: "Generate a weekly content plan for a campaign (creates topics, scores, selects best)",
      parameters: {
        type: "object",
        properties: {
          campaignId: { type: "string", description: "Campaign ID" },
          weekNumber: { type: "number", description: "Week number" },
          startDate: { type: "string", description: "Week start date (ISO)" },
          endDate: { type: "string", description: "Week end date (ISO)" },
        },
        required: ["campaignId", "weekNumber", "startDate", "endDate"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "approve_content_plan",
      description: "Approve a pending content plan for execution",
      parameters: {
        type: "object",
        properties: {
          planId: { type: "string", description: "Plan ID to approve" },
          userId: { type: "string", description: "Approving user ID" },
        },
        required: ["planId", "userId"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "execute_content_plan",
      description: "Execute an approved content plan (generates articles, social posts, video scripts)",
      parameters: {
        type: "object",
        properties: {
          planId: { type: "string", description: "Plan ID to execute" },
        },
        required: ["planId"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_content_status",
      description: "Get current content status — campaigns, plans, articles, publishing",
      parameters: {
        type: "object",
        properties: {
          campaignId: { type: "string", description: "Optional campaign ID to filter" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "pause_content_campaign",
      description: "Pause an active content campaign",
      parameters: {
        type: "object",
        properties: {
          campaignId: { type: "string", description: "Campaign ID to pause" },
        },
        required: ["campaignId"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_content_performance",
      description: "Get content performance metrics and analytics",
      parameters: {
        type: "object",
        properties: {
          campaignId: { type: "string", description: "Optional campaign ID" },
          days: { type: "number", description: "Number of days to look back (default 30)" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "check_content_duplicates",
      description: "Check if a topic would duplicate existing content",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string", description: "Topic title to check" },
          primaryKeyword: { type: "string", description: "Primary keyword" },
        },
        required: ["title"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_connection_status",
      description: "Check social media platform connection status",
      parameters: {
        type: "object",
        properties: {},
      },
    },
  },
  {
    type: "function",
    function: {
      name: "publish_content_item",
      description: "Publish a content item to connected platforms",
      parameters: {
        type: "object",
        properties: {
          contentItemId: { type: "string", description: "Content item ID" },
          platforms: {
            type: "array",
            items: { type: "string" },
            description: "Platforms to publish to",
          },
        },
        required: ["contentItemId"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_content_schedule",
      description: "Get upcoming content schedule for the next N days",
      parameters: {
        type: "object",
        properties: {
          days: { type: "number", description: "Number of days ahead (default 7)" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "execute_daily_content",
      description: "Trigger daily content execution — processes approved plans and publishes scheduled content",
      parameters: {
        type: "object",
        properties: {},
      },
    },
  },
];

// ─── Content Tool Executors ──────────────────────────────────────────────────

async function executeCreateContentCampaign(args: Record<string, unknown>) {
  const { createCampaign } = await import("@/lib/content-orchestrator");
  const campaign = await createCampaign({
    name: args.name as string,
    description: args.description as string | undefined,
    businessObjectives: args.businessObjectives as string[],
    targetAudience: args.targetAudience as string[],
    contentPillars: [],
    dateRange: {
      start: args.startDate as string,
      end: args.endDate as string,
    },
  });

  return {
    campaignId: campaign._id,
    name: campaign.name,
    slug: campaign.slug,
    status: campaign.status,
    message: "Campaign created successfully",
  };
}

async function executeGenerateWeeklyPlan(args: Record<string, unknown>) {
  const { generateWeeklyPlan } = await import("@/lib/content-orchestrator");
  const plan = await generateWeeklyPlan(
    args.campaignId as string,
    args.weekNumber as number,
    args.startDate as string,
    args.endDate as string
  );

  return {
    planId: plan._id,
    campaignId: plan.campaign,
    weekNumber: plan.weekNumber,
    status: plan.status,
    topics: plan.topics.length,
    message: `Week ${plan.weekNumber} plan generated with ${plan.topics.length} topics`,
  };
}

async function executeApproveContentPlan(args: Record<string, unknown>) {
  const { approvePlan } = await import("@/lib/content-orchestrator");
  const plan = await approvePlan(args.planId as string, args.userId as string);

  return {
    planId: plan._id,
    status: plan.status,
    message: "Plan approved for execution",
  };
}

async function executeExecuteContentPlan(args: Record<string, unknown>) {
  const { executePlan } = await import("@/lib/content-orchestrator");
  const result = await executePlan(args.planId as string);

  return {
    planId: args.planId,
    itemsCreated: result.itemsCreated,
    errors: result.errors,
    message: `Created ${result.itemsCreated} items. ${result.errors.length} errors.`,
  };
}

async function executeGetContentStatus(args: Record<string, unknown>) {
  const ContentCampaign = (await import("@/models/content-campaign")).default;
  const ContentPlan = (await import("@/models/content-plan")).default;
  const ContentItem = (await import("@/models/content-item")).default;

  await connectToDatabase();

  const campaignQuery: Record<string, unknown> = {};
  if (args.campaignId) campaignQuery._id = args.campaignId;

  const campaigns = await ContentCampaign.find(campaignQuery)
    .select("name slug status completionPercentage stats dateRange")
    .sort({ updatedAt: -1 })
    .limit(10)
    .lean();

  const activePlans = await ContentPlan.find({ status: { $in: ["approved", "executing"] } })
    .select("campaign weekNumber status startDate endDate")
    .populate("campaign", "name")
    .lean();

  const recentItems = await ContentItem.find({})
    .select("title type platform status scheduledAt publishedAt")
    .sort({ updatedAt: -1 })
    .limit(10)
    .lean();

  return {
    campaigns,
    activePlans,
    recentItems,
    summary: {
      totalCampaigns: campaigns.length,
      activePlans: activePlans.length,
      recentItems: recentItems.length,
    },
  };
}

async function executePauseContentCampaign(args: Record<string, unknown>) {
  const { pauseCampaign } = await import("@/lib/content-orchestrator");
  const campaign = await pauseCampaign(args.campaignId as string);

  return {
    campaignId: campaign._id,
    name: campaign.name,
    status: campaign.status,
    message: "Campaign paused",
  };
}

async function executeGetContentPerformance(args: Record<string, unknown>) {
  const ContentCampaign = (await import("@/models/content-campaign")).default;
  const ContentItem = (await import("@/models/content-item")).default;

  await connectToDatabase();

  const days = (args.days as number) || 30;
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const campaignQuery: Record<string, unknown> = {};
  if (args.campaignId) campaignQuery._id = args.campaignId;

  const campaigns = await ContentCampaign.find(campaignQuery)
    .select("name status stats completionPercentage")
    .lean();

  const publishedItems = await ContentItem.find({
    status: "published",
    publishedAt: { $gte: since },
  })
    .select("title type platform publishedAt qualityScores")
    .sort({ publishedAt: -1 })
    .lean();

  const totalPublished = publishedItems.length;
  const avgQuality =
    publishedItems.reduce(
      (sum, item) => sum + (item.qualityScores?.overall || 0),
      0
    ) / Math.max(totalPublished, 1);

  return {
    period: `${days} days`,
    campaigns,
    metrics: {
      totalPublished,
      avgQualityScore: Math.round(avgQuality * 10) / 10,
      byPlatform: publishedItems.reduce(
        (acc, item) => {
          const platform = item.platform || "unknown";
          acc[platform] = (acc[platform] || 0) + 1;
          return acc;
        },
        {} as Record<string, number>
      ),
      byType: publishedItems.reduce(
        (acc, item) => {
          acc[item.type] = (acc[item.type] || 0) + 1;
          return acc;
        },
        {} as Record<string, number>
      ),
    },
    recentItems: publishedItems.slice(0, 5),
  };
}

async function executeCheckContentDuplicates(args: Record<string, unknown>) {
  const ContentTopic = (await import("@/models/content-topic")).default;
  const ContentItem = (await import("@/models/content-item")).default;

  await connectToDatabase();

  const title = args.title as string;
  const primaryKeyword = args.primaryKeyword as string | undefined;

  const similarTopics = await ContentTopic.find({
    $or: [
      { title: { $regex: title, $options: "i" } },
      ...(primaryKeyword
        ? [{ primaryKeyword: { $regex: primaryKeyword, $options: "i" } }]
        : []),
    ],
  })
    .select("title slug primaryKeyword overallScore status")
    .limit(10)
    .lean();

  const similarItems = await ContentItem.find({
    $or: [
      { title: { $regex: title, $options: "i" } },
      ...(primaryKeyword
        ? [{ "seo.keywords": primaryKeyword }]
        : []),
    ],
  })
    .select("title type platform status")
    .limit(10)
    .lean();

  return {
    query: title,
    similarTopics,
    similarItems,
    isDuplicate: similarTopics.length > 0 || similarItems.length > 0,
    message:
      similarTopics.length > 0 || similarItems.length > 0
        ? "Potential duplicates found — review before creating"
        : "No duplicates found",
  };
}

async function executeGetConnectionStatus() {
  const ContentSettings = (await import("@/models/content-settings")).default;

  await connectToDatabase();

  const platforms = ["linkedin", "facebook", "instagram", "x", "tiktok", "youtube"];
  const connections: Record<string, { connected: boolean; lastPublish?: string; error?: string }> = {};

  for (const platform of platforms) {
    const setting = await ContentSettings.findOne({
      key: `connection_${platform}`,
    }).lean();

    connections[platform] = {
      connected: setting?.value?.connected || false,
      lastPublish: setting?.value?.lastPublish,
      error: setting?.value?.error,
    };
  }

  return { connections };
}

async function executePublishContentItem(args: Record<string, unknown>) {
  const ContentItem = (await import("@/models/content-item")).default;

  await connectToDatabase();

  const item = await ContentItem.findById(args.contentItemId as string).lean();
  if (!item) return { error: "Content item not found" };

  if (item.status !== "approved" && item.status !== "scheduled") {
    return {
      error: `Cannot publish item in status "${item.status}". Must be "approved" or "scheduled".`,
    };
  }

  const platforms = (args.platforms as string[]) || [item.platform || "blog"];

  await ContentItem.findByIdAndUpdate(args.contentItemId, {
    status: "publishing",
  });

  const publishResults: { platform: string; status: string; message: string }[] = [];
  for (const platform of platforms) {
    publishResults.push({
      platform,
      status: "queued",
      message: `Queued for publishing to ${platform}`,
    });
  }

  return {
    contentItemId: item._id,
    title: item.title,
    platforms,
    publishResults,
    message: `Publishing initiated for ${platforms.length} platform(s)`,
  };
}

async function executeGetContentSchedule(args: Record<string, unknown>) {
  const { getUpcomingSchedule } = await import("@/lib/content-scheduler");
  const days = (args.days as number) || 7;
  const schedule = await getUpcomingSchedule(days);
  return { schedule, days };
}

async function executeDailyContentTrigger() {
  const { executeDailyContent } = await import("@/lib/content-scheduler");
  const result = await executeDailyContent();
  return result;
}

// ─── Content Tool Executor ───────────────────────────────────────────────────

export async function executeContentTool(
  toolName: string,
  args: Record<string, unknown>
): Promise<unknown> {
  switch (toolName) {
    case "create_content_campaign":
      return executeCreateContentCampaign(args);
    case "generate_weekly_plan":
      return executeGenerateWeeklyPlan(args);
    case "approve_content_plan":
      return executeApproveContentPlan(args);
    case "execute_content_plan":
      return executeExecuteContentPlan(args);
    case "get_content_status":
      return executeGetContentStatus(args);
    case "pause_content_campaign":
      return executePauseContentCampaign(args);
    case "get_content_performance":
      return executeGetContentPerformance(args);
    case "check_content_duplicates":
      return executeCheckContentDuplicates(args);
    case "get_connection_status":
      return executeGetConnectionStatus();
    case "publish_content_item":
      return executePublishContentItem(args);
    case "get_content_schedule":
      return executeGetContentSchedule(args);
    case "execute_daily_content":
      return executeDailyContentTrigger();
    default:
      return { error: `Unknown content tool: ${toolName}` };
  }
}
