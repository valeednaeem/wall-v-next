import { connectToDatabase } from "@/lib/mongodb";
import ContentTopic from "@/models/content-topic";
import ContentCampaign from "@/models/content-campaign";
import type { IContentTopic } from "@/models/content-topic";
import type { IContentCampaign } from "@/models/content-campaign";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface ContentCluster {
  pillar: IContentTopic;
  supporting: IContentTopic[];
  internalLinks: Array<{ from: string; to: string; anchor: string }>;
  coverageScore: number;
  gaps: string[];
}

export interface TopicalAuthorityReport {
  clusters: ContentCluster[];
  coveragePercentage: number;
  gaps: string[];
  recommendations: string[];
}

// ─── Build Content Cluster from Pillar Topic ─────────────────────────────────

export async function buildContentCluster(
  pillarTopicId: string
): Promise<ContentCluster> {
  await connectToDatabase();

  const pillar = await ContentTopic.findById(pillarTopicId).lean() as unknown as IContentTopic | null;
  if (!pillar) {
    throw new Error("Pillar topic not found");
  }

  // Find supporting topics in the same campaign
  const supporting = await ContentTopic.find({
    campaign: pillar.campaign,
    _id: { $ne: pillarTopicId },
    status: { $in: ["planned", "in_progress", "completed", "selected"] },
  }).lean() as unknown as IContentTopic[];

  // Score each supporting topic's relationship to the pillar
  const scoredSupporting = supporting
    .map((topic) => ({
      topic,
      score: calculateTopicRelevance(pillar, topic),
    }))
    .filter((s) => s.score > 0.15)
    .sort((a, b) => b.score - a.score)
    .slice(0, 8)
    .map((s) => s.topic);

  // Map internal link opportunities
  const internalLinks = generateClusterLinks(pillar, scoredSupporting);

  // Calculate coverage score
  const coverageScore = calculateCoverageScore(pillar, scoredSupporting);

  // Identify gaps
  const gaps = identifyGaps(pillar, scoredSupporting);

  return {
    pillar,
    supporting: scoredSupporting,
    internalLinks,
    coverageScore,
    gaps,
  };
}

// ─── Auto-Organize Campaign into Clusters ────────────────────────────────────

export async function organizeCampaignClusters(
  campaignId: string
): Promise<ContentCluster[]> {
  await connectToDatabase();

  const campaign = await ContentCampaign.findById(campaignId).lean() as unknown as IContentCampaign | null;
  if (!campaign) {
    throw new Error("Campaign not found");
  }

  const topics = await ContentTopic.find({
    campaign: campaignId,
    status: { $in: ["planned", "in_progress", "completed", "selected"] },
  }).lean() as unknown as IContentTopic[];

  if (topics.length === 0) return [];

  // Identify pillar topics (highest score, broadest content types)
  const pillarCandidates = topics
    .filter((t) => t.contentType === "guide" || t.contentType === "deep-dive" || t.overallScore >= 7)
    .sort((a, b) => b.overallScore - a.overallScore);

  // Use campaign content pillars as hints
  const campaignPillarNames = (campaign.contentPillars || []).map((p) => p.name.toLowerCase());

  // Prefer topics that match campaign pillar names
  const prioritizedPillars = pillarCandidates.filter((t) =>
    campaignPillarNames.some(
      (name) =>
        t.title.toLowerCase().includes(name) ||
        t.primaryKeyword?.toLowerCase().includes(name)
    )
  );

  // Fallback to top-scored topics if no campaign pillar matches
  const finalPillars = prioritizedPillars.length > 0
    ? prioritizedPillars.slice(0, 3)
    : pillarCandidates.slice(0, 3);

  // If no pillar candidates, use top 3 by score
  const pillars = finalPillars.length > 0
    ? finalPillars
    : topics.sort((a, b) => b.overallScore - a.overallScore).slice(0, 3);

  // Assign supporting topics to nearest pillar
  const assignedSupporting = new Map<string, IContentTopic[]>();
  const assignedIds = new Set<string>();

  for (const pillar of pillars) {
    assignedSupporting.set(pillar._id.toString(), []);
  }

  for (const topic of topics) {
    if (pillars.some((p) => p._id.toString() === topic._id.toString())) continue;

    let bestPillar = pillars[0];
    let bestScore = 0;

    for (const pillar of pillars) {
      const score = calculateTopicRelevance(pillar, topic);
      if (score > bestScore) {
        bestScore = score;
        bestPillar = pillar;
      }
    }

    if (bestScore > 0.15) {
      const existing = assignedSupporting.get(bestPillar._id.toString()) || [];
      existing.push(topic);
      assignedSupporting.set(bestPillar._id.toString(), existing);
      assignedIds.add(topic._id.toString());
    }
  }

  // Build clusters
  const clusters: ContentCluster[] = [];

  for (const pillar of pillars) {
    const supporting = assignedSupporting.get(pillar._id.toString()) || [];
    const internalLinks = generateClusterLinks(pillar, supporting);
    const coverageScore = calculateCoverageScore(pillar, supporting);
    const gaps = identifyGaps(pillar, supporting);

    clusters.push({
      pillar,
      supporting,
      internalLinks,
      coverageScore,
      gaps,
    });
  }

  return clusters;
}

// ─── Suggest Missing Supporting Content ──────────────────────────────────────

export async function suggestSupportingContent(
  campaignId: string,
  pillarTopicId: string
): Promise<string[]> {
  await connectToDatabase();

  const pillar = await ContentTopic.findById(pillarTopicId).lean() as unknown as IContentTopic | null;
  if (!pillar) {
    throw new Error("Pillar topic not found");
  }

  const existingTopics = await ContentTopic.find({
    campaign: campaignId,
  })
    .select("title primaryKeyword secondaryKeywords contentType")
    .lean() as unknown as IContentTopic[];

  const existingTitles = new Set(existingTopics.map((t) => t.title.toLowerCase()));
  const existingKeywords = new Set(
    existingTopics.flatMap((t) => [
      t.primaryKeyword?.toLowerCase(),
      ...(t.secondaryKeywords || []).map((k) => k.toLowerCase()),
    ]).filter(Boolean)
  );

  const suggestions: string[] = [];

  // Based on pillar's primary keyword — suggest common supporting patterns
  const keyword = pillar.primaryKeyword || pillar.title;

  const supportingPatterns = [
    `How to Choose the Right ${keyword} for Your Business`,
    `${keyword} vs Alternatives: A Complete Comparison`,
    `${keyword} Best Practices for 2026`,
    `Common ${keyword} Mistakes to Avoid`,
    `${keyword} Checklist: What You Need to Know`,
    `How to Get Started with ${keyword}`,
    `${keyword} Case Study: Real Results`,
    `The Future of ${keyword}: Trends and Predictions`,
  ];

  for (const suggestion of supportingPatterns) {
    if (!existingTitles.has(suggestion.toLowerCase())) {
      // Check if the keyword area is already covered
      const keywordLower = suggestion.toLowerCase();
      const alreadyCovered = Array.from(existingKeywords).some(
        (k) => k && keywordLower.includes(k)
      );

      if (!alreadyCovered) {
        suggestions.push(suggestion);
      }
    }
  }

  // Also suggest content types not yet covered
  const existingTypes = new Set(existingTopics.map((t) => t.contentType));
  const missingTypes = ["how-to", "comparison", "checklist", "case-study", "mistakes-to-avoid"].filter(
    (t) => !existingTypes.has(t as IContentTopic["contentType"])
  );

  for (const type of missingTypes.slice(0, 2)) {
    const typeLabel = type.replace(/-/g, " ");
    const suggestion = `${typeLabel}: ${pillar.title}`;
    if (!existingTitles.has(suggestion.toLowerCase())) {
      suggestions.push(suggestion);
    }
  }

  return suggestions.slice(0, 6);
}

// ─── Assess Topical Authority ────────────────────────────────────────────────

export async function assessTopicalAuthority(
  campaignId: string
): Promise<TopicalAuthorityReport> {
  const clusters = await organizeCampaignClusters(campaignId);

  const allGaps: string[] = [];
  const allRecommendations: string[] = [];

  let totalCoverage = 0;

  for (const cluster of clusters) {
    totalCoverage += cluster.coverageScore;
    allGaps.push(...cluster.gaps);

    if (cluster.coverageScore < 50) {
      allRecommendations.push(
        `Cluster "${cluster.pillar.title}" has low coverage (${cluster.coverageScore}%). Add more supporting content.`
      );
    }

    if (cluster.supporting.length < 3) {
      allRecommendations.push(
        `Cluster "${cluster.pillar.title}" needs at least 3 supporting articles (currently ${cluster.supporting.length}).`
      );
    }

    if (cluster.internalLinks.length < 2) {
      allRecommendations.push(
        `Add more internal links in cluster "${cluster.pillar.title}" to strengthen topical signals.`
      );
    }
  }

  const coveragePercentage = clusters.length > 0
    ? Math.round(totalCoverage / clusters.length)
    : 0;

  // Overall recommendations
  if (clusters.length === 0) {
    allRecommendations.push("No content clusters found. Organize topics into pillar/supporting groups.");
  }

  if (coveragePercentage < 40) {
    allRecommendations.push("Overall campaign coverage is low. Focus on expanding pillar content first.");
  }

  return {
    clusters,
    coveragePercentage,
    gaps: Array.from(new Set(allGaps)),
    recommendations: Array.from(new Set(allRecommendations)),
  };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function calculateTopicRelevance(
  pillar: IContentTopic,
  topic: IContentTopic
): number {
  let score = 0;

  // Primary keyword overlap
  if (pillar.primaryKeyword && topic.primaryKeyword) {
    const pillarWords = pillar.primaryKeyword.toLowerCase().split(/\s+/);
    const topicWords = topic.primaryKeyword.toLowerCase().split(/\s+/);
    const overlap = pillarWords.filter((w) => topicWords.includes(w)).length;
    score += (overlap / Math.max(pillarWords.length, topicWords.length)) * 0.4;
  }

  // Secondary keyword overlap
  const pillarSecondary = (pillar.secondaryKeywords || []).map((k) => k.toLowerCase());
  const topicSecondary = (topic.secondaryKeywords || []).map((k) => k.toLowerCase());
  const secondaryOverlap = pillarSecondary.filter((k) =>
    topicSecondary.some((tk) => tk.includes(k) || k.includes(tk))
  ).length;
  if (pillarSecondary.length > 0 || topicSecondary.length > 0) {
    score += (secondaryOverlap / Math.max(pillarSecondary.length || 1, topicSecondary.length || 1)) * 0.3;
  }

  // Title similarity
  const pillarTitleWords = pillar.title.toLowerCase().split(/\s+/);
  const topicTitleWords = topic.title.toLowerCase().split(/\s+/);
  const titleOverlap = pillarTitleWords.filter((w) => topicTitleWords.includes(w)).length;
  score += (titleOverlap / Math.max(pillarTitleWords.length, topicTitleWords.length)) * 0.3;

  return Math.min(1, score);
}

function generateClusterLinks(
  pillar: IContentTopic,
  supporting: IContentTopic[]
): Array<{ from: string; to: string; anchor: string }> {
  const links: Array<{ from: string; to: string; anchor: string }> = [];

  // Each supporting article links to pillar
  for (const topic of supporting) {
    links.push({
      from: topic._id.toString(),
      to: pillar._id.toString(),
      anchor: pillar.primaryKeyword || pillar.title,
    });
  }

  // Pillar links to each supporting article
  for (const topic of supporting) {
    links.push({
      from: pillar._id.toString(),
      to: topic._id.toString(),
      anchor: topic.primaryKeyword || topic.title,
    });
  }

  // Supporting articles link to each other (top 3 related pairs)
  for (let i = 0; i < supporting.length; i++) {
    for (let j = i + 1; j < Math.min(supporting.length, i + 3); j++) {
      const relevance = calculateTopicRelevance(supporting[i], supporting[j]);
      if (relevance > 0.3) {
        links.push({
          from: supporting[i]._id.toString(),
          to: supporting[j]._id.toString(),
          anchor: supporting[j].primaryKeyword || supporting[j].title,
        });
      }
    }
  }

  return links;
}

function calculateCoverageScore(
  pillar: IContentTopic,
  supporting: IContentTopic[]
): number {
  let score = 0;

  // Base score for having a pillar
  score += 20;

  // Supporting content count (max 40 points)
  score += Math.min(40, supporting.length * 10);

  // Content type diversity
  const contentTypes = new Set(supporting.map((s) => s.contentType));
  score += Math.min(20, contentTypes.size * 5);

  // Keyword coverage
  const pillarKeywords = [
    pillar.primaryKeyword,
    ...(pillar.secondaryKeywords || []),
  ].filter(Boolean);

  const allCoveredKeywords = supporting.flatMap((s) => [
    s.primaryKeyword,
    ...(s.secondaryKeywords || []),
  ]).filter(Boolean) as string[];

  const coveredCount = pillarKeywords.filter((pk) =>
    allCoveredKeywords.some(
      (ck) => ck.toLowerCase().includes(pk?.toLowerCase() || "") || pk?.toLowerCase().includes(ck.toLowerCase())
    )
  ).length;

  score += pillarKeywords.length > 0
    ? Math.round((coveredCount / pillarKeywords.length) * 20)
    : 0;

  return Math.min(100, score);
}

function identifyGaps(
  pillar: IContentTopic,
  supporting: IContentTopic[]
): string[] {
  const gaps: string[] = [];

  // Missing content types
  const coveredTypes = new Set(supporting.map((s) => s.contentType));
  const expectedTypes: Array<{ type: string; label: string }> = [
    { type: "how-to", label: "How-to guide" },
    { type: "comparison", label: "Comparison article" },
    { type: "case-study", label: "Case study" },
    { type: "checklist", label: "Checklist/resource" },
    { type: "mistakes-to-avoid", label: "Common mistakes article" },
  ];

  for (const expected of expectedTypes) {
    if (!coveredTypes.has(expected.type as IContentTopic["contentType"])) {
      gaps.push(`Missing ${expected.label} for "${pillar.title}"`);
    }
  }

  // Missing keyword coverage
  const pillarKeywords = [
    pillar.primaryKeyword,
    ...(pillar.secondaryKeywords || []),
  ].filter(Boolean);

  const allCoveredKeywords = supporting.flatMap((s) => [
    s.primaryKeyword,
    ...(s.secondaryKeywords || []),
  ]).filter(Boolean);

  for (const kw of pillarKeywords) {
    if (!allCoveredKeywords.some((ck) =>
      ck?.toLowerCase().includes(kw?.toLowerCase() || "") || kw?.toLowerCase().includes(ck?.toLowerCase() || "")
    )) {
      gaps.push(`Keyword "${kw}" not covered by any supporting content`);
    }
  }

  // Minimum supporting content
  if (supporting.length < 3) {
    gaps.push(`Only ${supporting.length} supporting articles (recommend at least 3)`);
  }

  return gaps;
}
