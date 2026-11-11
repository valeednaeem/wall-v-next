import { connectToDatabase } from "@/lib/mongodb";
import ContentCampaign from "@/models/content-campaign";
import Product from "@/models/product";
import { getProviderAdapter } from "@/lib/ai-provider-adapter";
import { analyzePerformanceTrends } from "@/lib/content-analytics";

export interface DiscoveredTopic {
  title: string;
  description: string;
  primaryKeyword: string;
  secondaryKeywords: string[];
  searchIntent: "informational" | "navigational" | "commercial" | "transactional";
  contentType: string;
  businessRelevance: number;
  trendMomentum: number;
  seoOpportunity: number;
  competition: number;
  conversionPotential: number;
  socialPotential: number;
  videoPotential: number;
  sources: Array<{ title: string; url: string; snippet: string }>;
  overallScore?: number;
}

// ─── Topic Discovery ─────────────────────────────────────────────────────────

export async function discoverTopics(
  campaignId: string,
  options?: {
    count?: number;
    focusAreas?: string[];
    productServicePriorities?: Array<{ type: string; name: string }>;
  }
): Promise<DiscoveredTopic[]> {
  await connectToDatabase();

  const campaign = await ContentCampaign.findById(campaignId).lean() as unknown as {
    name: string;
    businessObjectives?: string[];
    targetAudience?: string[];
    contentPillars?: Array<{ name: string; description: string; keywords: string[] }>;
    productServicePriorities?: Array<{ type: string; name: string; slug: string; priority: number }>;
  } | null;
  if (!campaign) {
    throw new Error("Campaign not found");
  }

  const products = await Product.find({ status: "published" })
    .select("name type description features")
    .limit(20)
    .lean();

  const count = options?.count || 14;
  const focusAreas = options?.focusAreas || campaign.contentPillars?.map(
    (p: { name: string }) => p.name
  ) || [];
  const priorities = options?.productServicePriorities || campaign.productServicePriorities?.map(
    (p: { type: string; name: string }) => ({ type: p.type, name: p.name })
  ) || [];

  const model = process.env.AI_CONTENT_MODEL || process.env.OPENAI_MODEL || "gpt-4o";
  const adapter = getProviderAdapter(model);

  const systemPrompt = `You are a content strategist for Wall-V, a software agency specializing in web development, hosting, AI solutions, and digital products. Generate ${count} content topic ideas based on the campaign brief below. Return ONLY a JSON array with objects matching this schema:
[
  {
    "title": "string",
    "description": "string (2-3 sentences)",
    "primaryKeyword": "string",
    "secondaryKeywords": ["string"],
    "searchIntent": "informational|navigational|commercial|transactional",
    "contentType": "how-to|guide|comparison|tutorial|case-study|trend-analysis|deep-dive|checklist|faq|product-guide|service-guide|beginner-guide|mistakes-to-avoid|future-trends",
    "businessRelevance": 1-10,
    "trendMomentum": 1-10,
    "seoOpportunity": 1-10,
    "competition": 1-10,
    "conversionPotential": 1-10,
    "socialPotential": 1-10,
    "videoPotential": 1-10,
    "sources": [{"title": "string", "url": "string", "snippet": "string"}]
  }
]`;

  const userPrompt = `Campaign: ${campaign.name}
Business Objectives: ${campaign.businessObjectives?.join(", ") || "General growth"}
Target Audience: ${campaign.targetAudience?.join(", ") || "Businesses and developers"}
Content Pillars: ${focusAreas.join(", ") || "Web development, hosting, AI"}
Products/Services: ${priorities.map((p) => p.name).join(", ") || "General"}
Available Products: ${products.map((p) => `${p.name} (${p.type})`).join(", ")}

Generate ${count} diverse content topics that align with Wall-V's services, have strong SEO potential, and would resonate with the target audience. Focus on topics where Wall-V has unique expertise.`;

  const result = await adapter.chat({
    model,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    temperature: 0.7,
    maxTokens: 4096,
  });

  let topics: DiscoveredTopic[];
  try {
    const content = result.content.trim();
    const jsonMatch = content.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      throw new Error("No JSON array found in AI response");
    }
    topics = JSON.parse(jsonMatch[0]) as DiscoveredTopic[];
  } catch {
    throw new Error("Failed to parse AI response as topic array");
  }

  return topics.map((t) => ({
    ...t,
    businessRelevance: Math.min(10, Math.max(1, t.businessRelevance || 5)),
    trendMomentum: Math.min(10, Math.max(1, t.trendMomentum || 5)),
    seoOpportunity: Math.min(10, Math.max(1, t.seoOpportunity || 5)),
    competition: Math.min(10, Math.max(1, t.competition || 5)),
    conversionPotential: Math.min(10, Math.max(1, t.conversionPotential || 5)),
    socialPotential: Math.min(10, Math.max(1, t.socialPotential || 5)),
    videoPotential: Math.min(10, Math.max(1, t.videoPotential || 5)),
    sources: t.sources || [],
  }));
}

// ─── Topic Scoring ───────────────────────────────────────────────────────────

export async function scoreTopics(
  topics: DiscoveredTopic[]
): Promise<DiscoveredTopic[]> {
  // Fetch performance trends for analytics feedback loop
  let trends: Awaited<ReturnType<typeof analyzePerformanceTrends>> | null = null;
  try {
    trends = await analyzePerformanceTrends({ days: 30 });
  } catch {
    // Trends are optional — if unavailable, score without them
  }

  // Build lookup maps from trends
  const contentTypePerformance: Record<string, number> = {};
  if (trends?.bestContentTypes?.length) {
    const maxViews = Math.max(...trends.bestContentTypes.map((ct) => ct.avgViews), 1);
    for (const ct of trends.bestContentTypes) {
      // Normalize to 0-1 range
      contentTypePerformance[ct.type] = ct.avgViews / maxViews;
    }
  }

  const topicPerformance: Record<string, number> = {};
  if (trends?.bestTopics?.length) {
    const maxViews = Math.max(...trends.bestTopics.map((t) => t.avgViews), 1);
    for (const t of trends.bestTopics) {
      topicPerformance[t.topic.toLowerCase()] = t.avgViews / maxViews;
    }
  }

  const platformPerformance: Record<string, number> = {};
  if (trends?.bestPlatforms?.length) {
    const maxViews = Math.max(...trends.bestPlatforms.map((p) => p.totalViews), 1);
    for (const p of trends.bestPlatforms) {
      platformPerformance[p.platform] = p.totalViews / maxViews;
    }
  }

  return topics.map((topic) => {
    const contentDifferentiation = 7;
    const factualUncertainty = 3;
    const saturation = 5;

    const weightedScore =
      topic.seoOpportunity * 0.2 +
      topic.trendMomentum * 0.15 +
      topic.businessRelevance * 0.2 +
      topic.conversionPotential * 0.15 +
      topic.socialPotential * 0.1 +
      topic.videoPotential * 0.1 +
      contentDifferentiation * 0.1;

    const penalties =
      topic.competition * 0.1 +
      factualUncertainty * 0.05 +
      saturation * 0.05;

    let overallScore = Math.round((weightedScore - penalties) * 10) / 10;

    // ─── Analytics Feedback Loop ──────────────────────────────────────────
    if (trends) {
      let analyticsAdjustment = 0;

      // Boost/reduce based on content type performance
      const contentTypeKey = topic.contentType?.toLowerCase() || "";
      if (contentTypePerformance[contentTypeKey] !== undefined) {
        const perf = contentTypePerformance[contentTypeKey];
        if (perf > 0.6) {
          analyticsAdjustment += 0.5; // Boost high-performing content types
        } else if (perf < 0.3) {
          analyticsAdjustment -= 0.3; // Reduce low-performing content types
        }
      }

      // Boost/reduce based on topic keyword match
      const topicKey = topic.primaryKeyword?.toLowerCase() || "";
      for (const [trendTopic, perf] of Object.entries(topicPerformance)) {
        if (topicKey.includes(trendTopic) || trendTopic.includes(topicKey.split(" ")[0] || "")) {
          if (perf > 0.6) {
            analyticsAdjustment += 0.4;
          } else if (perf < 0.2) {
            analyticsAdjustment -= 0.2;
          }
          break;
        }
      }

      // Small boost for social-heavy topics if social platforms perform well
      if (topic.socialPotential >= 7) {
        const socialPerf = (platformPerformance["linkedin"] || 0) + (platformPerformance["x"] || 0);
        if (socialPerf > 1) {
          analyticsAdjustment += 0.2;
        }
      }

      // Apply adjustment capped at ±10% of base score
      const maxAdjustment = Math.abs(overallScore) * 0.1;
      analyticsAdjustment = Math.max(-maxAdjustment, Math.min(maxAdjustment, analyticsAdjustment));
      overallScore += analyticsAdjustment;
    }

    return {
      ...topic,
      overallScore: Math.min(10, Math.max(0, overallScore)),
    };
  });
}

// ─── Topic Selection ─────────────────────────────────────────────────────────

export async function selectBestTopics(
  topics: DiscoveredTopic[],
  count: number
): Promise<DiscoveredTopic[]> {
  const sorted = [...topics].sort(
    (a, b) => (b.overallScore || 0) - (a.overallScore || 0)
  );

  const selected: DiscoveredTopic[] = [];
  const keywordCounts: Record<string, number> = {};

  for (const topic of sorted) {
    if (selected.length >= count) break;

    const stem = extractKeywordStem(topic.primaryKeyword);
    const currentCount = keywordCounts[stem] || 0;

    if (currentCount >= 2) {
      continue;
    }

    selected.push(topic);
    keywordCounts[stem] = currentCount + 1;
  }

  if (selected.length < count) {
    for (const topic of sorted) {
      if (selected.length >= count) break;
      if (!selected.includes(topic)) {
        selected.push(topic);
      }
    }
  }

  return selected;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function extractKeywordStem(keyword: string): string {
  if (!keyword) return "unknown";
  return keyword
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .split(/\s+/)
    .slice(0, 2)
    .join(" ")
    .trim();
}
