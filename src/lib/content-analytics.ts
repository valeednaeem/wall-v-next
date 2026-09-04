import { connectToDatabase } from "@/lib/mongodb";
import ContentMetric from "@/models/content-metric";
import ContentItem from "@/models/content-item";
import BlogPost from "@/models/blog-post";
import type { IContentItem } from "@/models/content-item";
import type { IBlogPost } from "@/models/blog-post";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface GA4MetricRow {
  pagePath: string;
  views: number;
  clicks: number;
  impressions: number;
  ctr: number;
  avgTimeOnPage: number;
  bounceRate: number;
}

export interface ContentPerformance {
  totalViews: number;
  totalEngagement: number;
  conversionRate: number;
  topPlatform: string;
  trend: "up" | "down" | "stable";
}

export interface OverallPerformance {
  totalArticles: number;
  totalPublished: number;
  avgQualityScore: number;
  totalViews: number;
  topPerforming: { title: string; views: number; platform: string }[];
  worstPerforming: { title: string; views: number; platform: string }[];
  platformBreakdown: Record<string, { articles: number; views: number }>;
}

export interface PerformanceTrends {
  bestContentTypes: { type: string; avgViews: number; avgEngagement: number }[];
  bestTopics: { topic: string; avgViews: number; count: number }[];
  bestPlatforms: { platform: string; totalViews: number; totalEngagement: number }[];
  qualityScoreInsights: { minScore: number; avgPerformance: number }[];
  optimalPublishingDays: { dayOfWeek: number; avgViews: number }[];
  recommendations: string[];
}

export interface DecayReport {
  contentItemId: string;
  title: string;
  publishedAt: Date;
  currentViews: number;
  decayScore: number;
  reasons: string[];
  recommendedAction: string;
}

export interface DuplicateCheck {
  isDuplicate: boolean;
  similarItems: { id: string; title: string; similarity: number; type: string }[];
  recommendation: "create" | "update_existing" | "merge";
}

export interface InternalLinkSuggestion {
  anchorText: string;
  url: string;
  relevance: number;
  position: "intro" | "body" | "conclusion";
}

// ─── GA4 Metrics ──────────────────────────────────────────────────────────────

export async function fetchGA4Metrics(options: {
  startDate: string;
  endDate: string;
  dimensions?: string[];
}): Promise<GA4MetricRow[]> {
  await connectToDatabase();

  const startDate = new Date(options.startDate === "7daysAgo"
    ? Date.now() - 7 * 24 * 60 * 60 * 1000
    : options.startDate);
  const endDate = options.endDate === "today" ? new Date() : new Date(options.endDate);

  const blogPosts = await BlogPost.find({
    status: "published",
    publishedAt: { $gte: startDate, $lte: endDate },
  })
    .select("title slug viewCount likeCount commentCount publishedAt")
    .lean();

  return blogPosts.map((post: IBlogPost) => ({
    pagePath: `/blog/${post.slug}`,
    views: post.viewCount || 0,
    clicks: 0,
    impressions: 0,
    ctr: 0,
    avgTimeOnPage: 0,
    bounceRate: 0,
  }));
}

// ─── Record Metrics ───────────────────────────────────────────────────────────

export async function recordContentMetrics(
  contentItemId: string,
  platform: string,
  metrics: Record<string, number>
): Promise<void> {
  await connectToDatabase();

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  await ContentMetric.findOneAndUpdate(
    { contentItem: contentItemId, platform, date: today },
    {
      contentItem: contentItemId,
      platform,
      date: today,
      metrics: {
        impressions: metrics.impressions || 0,
        views: metrics.views || 0,
        clicks: metrics.clicks || 0,
        reactions: metrics.reactions || 0,
        comments: metrics.comments || 0,
        shares: metrics.shares || 0,
        saves: metrics.saves || 0,
        watchTime: metrics.watchTime || 0,
        retention: metrics.retention || 0,
        ctr: metrics.ctr || 0,
        conversions: metrics.conversions || 0,
        followerGrowth: metrics.followerGrowth || 0,
      },
      source: "manual",
      fetchedAt: new Date(),
    },
    { upsert: true, new: true }
  );
}

// ─── Content Performance ──────────────────────────────────────────────────────

export async function getContentPerformance(
  contentItemId: string
): Promise<ContentPerformance> {
  await connectToDatabase();

  const metrics = await ContentMetric.find({ contentItem: contentItemId })
    .sort({ date: -1 })
    .lean();

  const platformTotals: Record<string, { views: number; engagement: number }> = {};

  for (const m of metrics) {
    const p = m.platform;
    if (!platformTotals[p]) {
      platformTotals[p] = { views: 0, engagement: 0 };
    }
    platformTotals[p].views += m.metrics?.views || 0;
    platformTotals[p].engagement +=
      (m.metrics?.reactions || 0) +
      (m.metrics?.comments || 0) +
      (m.metrics?.shares || 0) +
      (m.metrics?.saves || 0);
  }

  let totalViews = 0;
  let totalEngagement = 0;
  let topPlatform = "";
  let topViews = 0;

  for (const [platform, data] of Object.entries(platformTotals)) {
    totalViews += data.views;
    totalEngagement += data.engagement;
    if (data.views > topViews) {
      topViews = data.views;
      topPlatform = platform;
    }
  }

  const totalConversions = metrics.reduce(
    (sum, m) => sum + (m.metrics?.conversions || 0),
    0
  );
  const conversionRate = totalViews > 0 ? totalConversions / totalViews : 0;

  let trend: "up" | "down" | "stable" = "stable";
  if (metrics.length >= 2) {
    const recent = metrics.slice(0, Math.ceil(metrics.length / 2));
    const older = metrics.slice(Math.ceil(metrics.length / 2));
    const recentAvg =
      recent.reduce((s, m) => s + (m.metrics?.views || 0), 0) / recent.length;
    const olderAvg =
      older.reduce((s, m) => s + (m.metrics?.views || 0), 0) / older.length || 1;
    const change = (recentAvg - olderAvg) / olderAvg;
    if (change > 0.1) trend = "up";
    else if (change < -0.1) trend = "down";
  }

  return {
    totalViews,
    totalEngagement,
    conversionRate,
    topPlatform,
    trend,
  };
}

// ─── Overall Performance ──────────────────────────────────────────────────────

export async function getOverallPerformance(options?: {
  campaignId?: string;
  days?: number;
}): Promise<OverallPerformance> {
  await connectToDatabase();

  const query: Record<string, unknown> = {};
  if (options?.campaignId) {
    query.campaign = options.campaignId;
  }
  if (options?.days) {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - options.days);
    query.createdAt = { $gte: cutoff };
  }

  const items = await ContentItem.find(query)
    .select("title type platform status qualityScores publishedAt")
    .lean();

  const totalArticles = items.filter((i) => i.type === "article").length;
  const totalPublished = items.filter((i) => i.status === "published").length;

  const scores = items
    .filter((i) => i.qualityScores?.overall != null)
    .map((i) => i.qualityScores!.overall!);
  const avgQualityScore =
    scores.length > 0
      ? scores.reduce((a, b) => a + b, 0) / scores.length
      : 0;

  const publishedItems = items.filter((i) => i.status === "published");

  const blogPosts = await BlogPost.find({
    status: "published",
    ...(options?.days
      ? {
          publishedAt: {
            $gte: new Date(Date.now() - options.days * 24 * 60 * 60 * 1000),
          },
        }
      : {}),
  })
    .select("title slug viewCount likeCount")
    .lean();

  const totalViews = blogPosts.reduce(
    (sum, p) => sum + ((p as IBlogPost).viewCount || 0),
    0
  );

  const sortedByViews = [...blogPosts].sort(
    (a, b) => ((b as IBlogPost).viewCount || 0) - ((a as IBlogPost).viewCount || 0)
  );

  const topPerforming = sortedByViews.slice(0, 5).map((p) => ({
    title: (p as IBlogPost).title,
    views: (p as IBlogPost).viewCount || 0,
    platform: "blog",
  }));

  const worstPerforming = sortedByViews
    .slice(-5)
    .reverse()
    .map((p) => ({
      title: (p as IBlogPost).title,
      views: (p as IBlogPost).viewCount || 0,
      platform: "blog",
    }));

  const platformBreakdown: Record<
    string,
    { articles: number; views: number }
  > = {};
  for (const item of publishedItems) {
    const p = item.platform || "blog";
    if (!platformBreakdown[p]) {
      platformBreakdown[p] = { articles: 0, views: 0 };
    }
    platformBreakdown[p].articles += 1;
  }
  for (const post of blogPosts) {
    if (!platformBreakdown.blog) {
      platformBreakdown.blog = { articles: 0, views: 0 };
    }
    platformBreakdown.blog.views += (post as IBlogPost).viewCount || 0;
  }

  return {
    totalArticles,
    totalPublished,
    avgQualityScore: Math.round(avgQualityScore * 10) / 10,
    totalViews,
    topPerforming,
    worstPerforming,
    platformBreakdown,
  };
}

// ─── Learning Loop: Performance Trends ────────────────────────────────────────

export async function analyzePerformanceTrends(options?: {
  days?: number;
}): Promise<PerformanceTrends> {
  await connectToDatabase();

  const days = options?.days || 90;
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);

  const items = await ContentItem.find({
    status: "published",
    publishedAt: { $gte: cutoff },
  })
    .select("title type platform qualityScores publishedAt")
    .lean();

  const blogPosts = await BlogPost.find({
    status: "published",
    publishedAt: { $gte: cutoff },
  })
    .select("title slug viewCount likeCount commentCount publishedAt category tags")
    .lean();

  // 1. Content type performance
  const typeMetrics: Record<string, { views: number; engagement: number; count: number }> = {};
  for (const item of items) {
    const t = item.type;
    if (!typeMetrics[t]) typeMetrics[t] = { views: 0, engagement: 0, count: 0 };
    typeMetrics[t].count += 1;
  }
  for (const post of blogPosts) {
    const bp = post as IBlogPost;
    if (!typeMetrics.article) typeMetrics.article = { views: 0, engagement: 0, count: 0 };
    typeMetrics.article.views += bp.viewCount || 0;
    typeMetrics.article.engagement += (bp.likeCount || 0) + (bp.commentCount || 0);
  }

  const bestContentTypes = Object.entries(typeMetrics)
    .map(([type, data]) => ({
      type,
      avgViews: data.count > 0 ? data.views / data.count : 0,
      avgEngagement: data.count > 0 ? data.engagement / data.count : 0,
    }))
    .sort((a, b) => b.avgViews - a.avgViews);

  // 2. Topic performance (from blog post titles/categories)
  const topicMetrics: Record<string, { views: number; count: number }> = {};
  for (const post of blogPosts) {
    const bp = post as IBlogPost;
    const words = bp.title.split(/\s+/).slice(0, 3).join(" ");
    if (!topicMetrics[words]) topicMetrics[words] = { views: 0, count: 0 };
    topicMetrics[words].views += bp.viewCount || 0;
    topicMetrics[words].count += 1;
  }

  const bestTopics = Object.entries(topicMetrics)
    .map(([topic, data]) => ({
      topic,
      avgViews: data.views / data.count,
      count: data.count,
    }))
    .sort((a, b) => b.avgViews - a.avgViews)
    .slice(0, 10);

  // 3. Platform performance
  const platformMetrics: Record<string, { views: number; engagement: number }> = {};
  const itemsByPlatform = await ContentMetric.aggregate([
    { $match: { date: { $gte: cutoff } } },
    {
      $group: {
        _id: "$platform",
        totalViews: { $sum: "$metrics.views" },
        totalEngagement: {
          $sum: {
            $add: [
              "$metrics.reactions",
              "$metrics.comments",
              "$metrics.shares",
              "$metrics.saves",
            ],
          },
        },
      },
    },
  ]);

  for (const agg of itemsByPlatform) {
    platformMetrics[agg._id] = {
      views: agg.totalViews,
      engagement: agg.totalEngagement,
    };
  }

  const bestPlatforms = Object.entries(platformMetrics)
    .map(([platform, data]) => ({
      platform,
      totalViews: data.views,
      totalEngagement: data.engagement,
    }))
    .sort((a, b) => b.totalViews - a.totalViews);

  // 4. Quality score insights
  const qualityBuckets: Record<number, { scores: number[]; views: number[] }> = {};
  for (const item of items) {
    if (item.qualityScores?.overall != null) {
      const bucket = Math.floor(item.qualityScores.overall / 2) * 2;
      if (!qualityBuckets[bucket]) qualityBuckets[bucket] = { scores: [], views: [] };
      qualityBuckets[bucket].scores.push(item.qualityScores.overall);
    }
  }
  for (const post of blogPosts) {
    const bp = post as IBlogPost;
    const bucket = 6;
    if (!qualityBuckets[bucket]) qualityBuckets[bucket] = { scores: [], views: [] };
    qualityBuckets[bucket].views.push(bp.viewCount || 0);
  }

  const qualityScoreInsights = Object.entries(qualityBuckets)
    .map(([score, data]) => ({
      minScore: Number(score),
      avgPerformance:
        data.views.length > 0
          ? data.views.reduce((a, b) => a + b, 0) / data.views.length
          : 0,
    }))
    .sort((a, b) => b.minScore - a.minScore);

  // 5. Optimal publishing days
  const dayMetrics: Record<number, { views: number; count: number }> = {};
  for (const post of blogPosts) {
    const bp = post as IBlogPost;
    if (bp.publishedAt) {
      const day = bp.publishedAt.getDay();
      if (!dayMetrics[day]) dayMetrics[day] = { views: 0, count: 0 };
      dayMetrics[day].views += bp.viewCount || 0;
      dayMetrics[day].count += 1;
    }
  }

  const optimalPublishingDays = Object.entries(dayMetrics)
    .map(([day, data]) => ({
      dayOfWeek: Number(day),
      avgViews: data.count > 0 ? data.views / data.count : 0,
    }))
    .sort((a, b) => b.avgViews - a.avgViews);

  // 6. Recommendations
  const recommendations: string[] = [];
  if (bestContentTypes.length > 0) {
    recommendations.push(
      `Focus on "${bestContentTypes[0].type}" content — averaging ${Math.round(bestContentTypes[0].avgViews)} views per piece`
    );
  }
  if (bestPlatforms.length > 0) {
    recommendations.push(
      `Prioritize "${bestPlatforms[0].platform}" — highest engagement channel with ${bestPlatforms[0].totalEngagement} total interactions`
    );
  }
  if (optimalPublishingDays.length > 0) {
    const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    recommendations.push(
      `Optimal publishing day: ${dayNames[optimalPublishingDays[0].dayOfWeek]} (avg ${Math.round(optimalPublishingDays[0].avgViews)} views)`
    );
  }
  if (qualityScoreInsights.length > 1) {
    const high = qualityScoreInsights[0];
    const low = qualityScoreInsights[qualityScoreInsights.length - 1];
    if (high.avgPerformance > low.avgPerformance * 1.5) {
      recommendations.push(
        `Content with quality score ${high.minScore}+ performs ${Math.round(high.avgPerformance / (low.avgPerformance || 1))}x better than score ${low.minScore}`
      );
    }
  }

  return {
    bestContentTypes,
    bestTopics,
    bestPlatforms,
    qualityScoreInsights,
    optimalPublishingDays,
    recommendations,
  };
}

// ─── Content Decay Detection ──────────────────────────────────────────────────

export async function detectContentDecay(options?: {
  daysSincePublish?: number;
  viewThreshold?: number;
}): Promise<DecayReport[]> {
  await connectToDatabase();

  const daysThreshold = options?.daysSincePublish || 90;
  const viewThreshold = options?.viewThreshold || 50;
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - daysThreshold);

  const staleItems = await ContentItem.find({
    status: "published",
    publishedAt: { $lte: cutoff },
  })
    .select("title slug publishedAt qualityScores platform type")
    .lean();

  const reports: DecayReport[] = [];

  for (const item of staleItems) {
    const ci = item as unknown as IContentItem;
    const reasons: string[] = [];
    let decayScore = 0;

    // Check age
    const ageDays = ci.publishedAt
      ? Math.floor(
          (Date.now() - new Date(ci.publishedAt).getTime()) / (1000 * 60 * 60 * 24)
        )
      : 0;

    if (ageDays > 180) {
      reasons.push(`Content is ${ageDays} days old (over 6 months)`);
      decayScore += 30;
    } else if (ageDays > 120) {
      reasons.push(`Content is ${ageDays} days old (over 4 months)`);
      decayScore += 20;
    } else if (ageDays > daysThreshold) {
      reasons.push(`Content is ${ageDays} days old (over ${daysThreshold} days)`);
      decayScore += 10;
    }

    // Check quality scores
    if (ci.qualityScores?.overall != null && ci.qualityScores.overall < 5) {
      reasons.push(`Low quality score: ${ci.qualityScores.overall}/10`);
      decayScore += 20;
    }

    // Check for low engagement signals
    const metrics = await ContentMetric.find({ contentItem: ci._id })
      .sort({ date: -1 })
      .limit(30)
      .lean();

    if (metrics.length > 0) {
      const recentViews = metrics.reduce(
        (sum, m) => sum + (m.metrics?.views || 0),
        0
      );
      const avgViews = recentViews / metrics.length;

      if (avgViews < viewThreshold) {
        reasons.push(
          `Low recent engagement: avg ${Math.round(avgViews)} views per measurement`
        );
        decayScore += 25;
      }
    } else {
      reasons.push("No metrics collected — content may not be tracked");
      decayScore += 15;
    }

    // Check blog post for views
    if (ci.relatedBlogPost) {
      const blogPost = await BlogPost.findById(ci.relatedBlogPost)
        .select("viewCount likeCount commentCount")
        .lean();
      if (blogPost) {
        const bp = blogPost as IBlogPost;
        if ((bp.viewCount || 0) < viewThreshold) {
          reasons.push(`Blog post has only ${bp.viewCount || 0} views`);
          decayScore += 20;
        }
        if ((bp.likeCount || 0) === 0 && (bp.commentCount || 0) === 0) {
          reasons.push("Zero engagement (likes and comments)");
          decayScore += 15;
        }
      }
    }

    // Check for outdated keywords
    const content = ci as unknown as { content?: string };
    const outdatedTerms = [
      "2023",
      "2024",
      "last year",
      "recently launched",
      "new feature",
      "coming soon",
    ];
    if (content.content) {
      for (const term of outdatedTerms) {
        if (content.content.toLowerCase().includes(term)) {
          reasons.push(`Contains potentially outdated reference: "${term}"`);
          decayScore += 10;
          break;
        }
      }
    }

    if (reasons.length === 0) continue;

    const normalizedScore = Math.min(100, decayScore);

    let recommendedAction = "monitor";
    if (normalizedScore >= 70) {
      recommendedAction = "rewrite";
    } else if (normalizedScore >= 50) {
      recommendedAction = "update";
    } else if (normalizedScore >= 30) {
      recommendedAction = "refresh";
    }

    reports.push({
      contentItemId: ci._id?.toString() || "",
      title: ci.title,
      publishedAt: ci.publishedAt || new Date(),
      currentViews: metrics.reduce(
        (sum, m) => sum + (m.metrics?.views || 0),
        0
      ),
      decayScore: normalizedScore,
      reasons,
      recommendedAction,
    });
  }

  return reports.sort((a, b) => b.decayScore - a.decayScore);
}

// ─── Content Deduplication ────────────────────────────────────────────────────

function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function calculateSimilarity(a: string, b: string): number {
  const wordsA = new Set(normalizeText(a).split(" "));
  const wordsB = new Set(normalizeText(b).split(" "));
  const intersection = new Set([...wordsA].filter((w) => wordsB.has(w)));
  const union = new Set([...wordsA, ...wordsB]);
  return union.size > 0 ? intersection.size / union.size : 0;
}

export async function checkForDuplicates(
  title: string,
  primaryKeyword: string,
  campaignId?: string
): Promise<DuplicateCheck> {
  await connectToDatabase();

  const query: Record<string, unknown> = {};
  if (campaignId) {
    query.campaign = campaignId;
  }

  const existingItems = await ContentItem.find(query)
    .select("title slug type platform")
    .lean();

  const existingPosts = await BlogPost.find({ status: { $ne: "archived" } })
    .select("title slug")
    .lean();

  const allExisting = [
    ...existingItems.map((i) => ({
      id: (i._id as string).toString(),
      title: i.title,
      type: i.type,
      similarity: 0,
    })),
    ...existingPosts.map((p) => ({
      id: (p._id as string).toString(),
      title: (p as IBlogPost).title,
      type: "blog_post",
      similarity: 0,
    })),
  ];

  const similarItems: DuplicateCheck["similarItems"] = [];

  for (const existing of allExisting) {
    const titleSim = calculateSimilarity(title, existing.title);
    const keywordSim = calculateSimilarity(
      primaryKeyword,
      existing.title
    );
    const maxSim = Math.max(titleSim, keywordSim);

    if (maxSim > 0.5) {
      similarItems.push({
        id: existing.id,
        title: existing.title,
        similarity: Math.round(maxSim * 100) / 100,
        type: existing.type,
      });
    }
  }

  similarItems.sort((a, b) => b.similarity - a.similarity);

  const isDuplicate = similarItems.some((s) => s.similarity >= 0.8);
  let recommendation: DuplicateCheck["recommendation"] = "create";

  if (isDuplicate) {
    recommendation = "update_existing";
  } else if (similarItems.length > 0 && similarItems[0].similarity > 0.6) {
    recommendation = "merge";
  }

  return {
    isDuplicate,
    similarItems: similarItems.slice(0, 5),
    recommendation,
  };
}

// ─── Internal Link Suggestions ────────────────────────────────────────────────

export async function suggestInternalLinks(
  content: string,
  primaryKeyword: string
): Promise<InternalLinkSuggestion[]> {
  await connectToDatabase();

  const keywords = [
    primaryKeyword,
    ...primaryKeyword.split(" ").filter((w) => w.length > 3),
  ];

  const blogPosts = await BlogPost.find({
    status: "published",
  })
    .select("title slug content excerpt")
    .lean();

  const contentItems = await ContentItem.find({
    status: "published",
    type: "article",
  })
    .select("title slug content excerpt")
    .lean();

  const suggestions: InternalLinkSuggestion[] = [];

  const allContent = [
    ...blogPosts.map((p) => ({
      title: (p as IBlogPost).title,
      url: `/blog/${(p as IBlogPost).slug}`,
      content: (p as IBlogPost).content || "",
      excerpt: (p as IBlogPost).excerpt || "",
    })),
    ...contentItems.map((i) => ({
      title: i.title,
      url: `/blog/${i.slug || ""}`,
      content: i.content || "",
      excerpt: i.excerpt || "",
    })),
  ];

  const contentLower = content.toLowerCase();

  for (const item of allContent) {
    const textToSearch = `${item.title} ${item.excerpt} ${item.content}`.toLowerCase();
    let relevance = 0;

    for (const kw of keywords) {
      const kwLower = kw.toLowerCase();
      if (textToSearch.includes(kwLower)) {
        relevance += 0.3;
      }
    }

    if (relevance > 0) {
      let position: InternalLinkSuggestion["position"] = "body";
      const titleLower = item.title.toLowerCase();
      if (contentLower.indexOf(titleLower) < content.length * 0.2) {
        position = "intro";
      } else if (contentLower.indexOf(titleLower) > content.length * 0.8) {
        position = "conclusion";
      }

      suggestions.push({
        anchorText: item.title,
        url: item.url,
        relevance: Math.min(1, relevance),
        position,
      });
    }
  }

  suggestions.sort((a, b) => b.relevance - a.relevance);

  return suggestions.slice(0, 10);
}
