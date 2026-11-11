import { connectToDatabase } from "@/lib/mongodb";
import ContentItem from "@/models/content-item";
import BlogPost from "@/models/blog-post";
import type { IContentItem } from "@/models/content-item";
import type { IBlogPost } from "@/models/blog-post";
import { getProviderAdapter } from "@/lib/ai-provider-adapter";
import { runQualityPipeline } from "@/lib/content-quality";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface DuplicateGroup {
  primary: DuplicateCandidate;
  duplicates: DuplicateCandidate[];
  similarityScore: number;
  recommendedAction: "merge" | "keep_both" | "archive";
  mergePreview?: MergedContent;
}

export interface DuplicateCandidate {
  id: string;
  title: string;
  type: "content_item" | "blog_post";
  contentType?: string;
  primaryKeyword?: string;
  publishedAt?: Date;
  qualityScore?: number;
  status: string;
  content?: string;
  tags?: string[];
  campaign?: string;
}

export interface MergedContent {
  title: string;
  content: string;
  primaryKeyword: string;
  secondaryKeywords: string[];
  qualityScore: number;
  internalLinks: Array<{ anchorText: string; url: string }>;
}

interface ContentFingerprint {
  id: string;
  title: string;
  type: "content_item" | "blog_post";
  keywords: Set<string>;
  contentWords: Set<string>;
  candidate: DuplicateCandidate;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function extractKeywords(text: string): Set<string> {
  const normalized = normalizeText(text);
  const words = normalized.split(" ").filter((w) => w.length > 2);
  return new Set(words);
}

function calculateJaccardSimilarity(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 && b.size === 0) return 0;
  let intersection = 0;
  for (const word of a) {
    if (b.has(word)) intersection++;
  }
  const union = new Set([...a, ...b]).size;
  return union > 0 ? intersection / union : 0;
}

function buildFingerprint(
  id: string,
  title: string,
  type: "content_item" | "blog_post",
  keywords: string[],
  content: string,
  candidate: DuplicateCandidate
): ContentFingerprint {
  const keywordSet = new Set(
    keywords
      .filter(Boolean)
      .flatMap((k) => normalizeText(k).split(" "))
      .filter((w) => w.length > 2)
  );
  const titleWords = extractKeywords(title);
  keywordSet.forEach((w) => titleWords.add(w));

  const contentFirst200 = content.split(/\s+/).slice(0, 200).join(" ");
  const contentWords = extractKeywords(contentFirst200);

  return {
    id,
    title,
    type,
    keywords: keywordSet,
    contentWords,
    candidate,
  };
}

function pickPrimary(candidates: DuplicateCandidate[]): DuplicateCandidate {
  return candidates.reduce((best, curr) => {
    const bestScore = best.qualityScore ?? 0;
    const currScore = curr.qualityScore ?? 0;
    if (currScore > bestScore) return curr;
    if (currScore === bestScore && curr.publishedAt && best.publishedAt) {
      return curr.publishedAt > best.publishedAt ? curr : best;
    }
    return best;
  });
}

function recommendAction(
  similarity: number,
  primary: DuplicateCandidate,
  duplicate: DuplicateCandidate
): "merge" | "keep_both" | "archive" {
  if (similarity >= 0.85) return "merge";
  if (similarity >= 0.6) {
    if (primary.primaryKeyword && duplicate.primaryKeyword) {
      const kwSim = calculateJaccardSimilarity(
        extractKeywords(primary.primaryKeyword),
        extractKeywords(duplicate.primaryKeyword)
      );
      if (kwSim > 0.7) return "merge";
    }
    return "keep_both";
  }
  return "keep_both";
}

// ─── Find All Duplicates ──────────────────────────────────────────────────────

export async function findAllDuplicates(options?: {
  campaignId?: string;
  threshold?: number;
}): Promise<DuplicateGroup[]> {
  await connectToDatabase();

  const threshold = options?.threshold ?? 0.6;

  const contentQuery: Record<string, unknown> = {};
  if (options?.campaignId) contentQuery.campaign = options.campaignId;

  const [contentItems, blogPosts] = await Promise.all([
    ContentItem.find(contentQuery)
      .select("title type platform status qualityScores seo content campaign publishedAt")
      .lean(),
    BlogPost.find({ status: { $ne: "archived" } })
      .select("title slug content status publishedAt seo")
      .lean(),
  ]);

  const fingerprints: ContentFingerprint[] = [];

  for (const item of contentItems) {
    const ci = item as unknown as IContentItem;
    if (ci.status === "archived") continue;

    fingerprints.push(
      buildFingerprint(
        ci._id?.toString() || "",
        ci.title,
        "content_item",
        ci.seo?.keywords || [],
        ci.content || "",
        {
          id: ci._id?.toString() || "",
          title: ci.title,
          type: "content_item",
          contentType: ci.type,
          primaryKeyword: ci.seo?.keywords?.[0],
          publishedAt: ci.publishedAt,
          qualityScore: ci.qualityScores?.overall,
          status: ci.status,
          content: ci.content,
          tags: ci.seo?.keywords,
          campaign: ci.campaign?.toString(),
        }
      )
    );
  }

  for (const post of blogPosts) {
    const bp = post as unknown as IBlogPost;
    fingerprints.push(
      buildFingerprint(
        bp._id?.toString() || "",
        bp.title,
        "blog_post",
        bp.seo?.keywords || [],
        bp.content || "",
        {
          id: bp._id?.toString() || "",
          title: bp.title,
          type: "blog_post",
          primaryKeyword: bp.seo?.keywords?.[0],
          publishedAt: bp.publishedAt,
          status: bp.status,
          content: bp.content,
        }
      )
    );
  }

  const paired = new Set<string>();
  const rawGroups: Map<string, DuplicateCandidate[]> = new Map();

  for (let i = 0; i < fingerprints.length; i++) {
    for (let j = i + 1; j < fingerprints.length; j++) {
      const a = fingerprints[i];
      const b = fingerprints[j];

      const pairKey = [a.id, b.id].sort().join(":");
      if (paired.has(pairKey)) continue;

      const titleSim = calculateJaccardSimilarity(
        extractKeywords(a.title),
        extractKeywords(b.title)
      );
      const kwSim = calculateJaccardSimilarity(a.keywords, b.keywords);
      const contentSim = calculateJaccardSimilarity(a.contentWords, b.contentWords);

      const similarity =
        titleSim * 0.4 + kwSim * 0.35 + contentSim * 0.25;

      if (similarity >= threshold) {
        paired.add(pairKey);

        const groupKey = findGroupKey(rawGroups, a.id, b.id);
        if (!rawGroups.has(groupKey)) {
          rawGroups.set(groupKey, []);
        }
        const group = rawGroups.get(groupKey)!;
        if (!group.find((c) => c.id === a.id)) group.push(a.candidate);
        if (!group.find((c) => c.id === b.id)) group.push(b.candidate);
      }
    }
  }

  const groups: DuplicateGroup[] = [];

  for (const candidates of rawGroups.values()) {
    if (candidates.length < 2) continue;

    const primary = pickPrimary(candidates);
    const duplicates = candidates.filter((c) => c.id !== primary.id);

    let maxSim = 0;
    for (const dup of duplicates) {
      const primaryFp = fingerprints.find((f) => f.id === primary.id)!;
      const dupFp = fingerprints.find((f) => f.id === dup.id)!;
      if (primaryFp && dupFp) {
        const sim =
          calculateJaccardSimilarity(
            extractKeywords(primaryFp.title),
            extractKeywords(dupFp.title)
          ) *
            0.4 +
          calculateJaccardSimilarity(primaryFp.keywords, dupFp.keywords) *
            0.35 +
          calculateJaccardSimilarity(primaryFp.contentWords, dupFp.contentWords) *
            0.25;
        if (sim > maxSim) maxSim = sim;
      }
    }

    const action = recommendAction(maxSim, primary, duplicates[0]);

    const group: DuplicateGroup = {
      primary,
      duplicates,
      similarityScore: Math.round(maxSim * 100) / 100,
      recommendedAction: action,
    };

    groups.push(group);
  }

  groups.sort((a, b) => b.similarityScore - a.similarityScore);

  return groups;
}

function findGroupKey(
  groups: Map<string, DuplicateCandidate[]>,
  idA: string,
  idB: string
): string {
  for (const [key, candidates] of groups) {
    const ids = candidates.map((c) => c.id);
    if (ids.includes(idA) || ids.includes(idB)) return key;
  }
  return `${idA}:${idB}`;
}

// ─── AI Synthesize ────────────────────────────────────────────────────────────

export async function aiSynthesize(
  primary: IContentItem,
  duplicate: IContentItem
): Promise<MergedContent> {
  const model = process.env.AI_CONTENT_MODEL || process.env.OPENAI_MODEL || "gpt-4o";
  const adapter = getProviderAdapter(model);

  const systemPrompt = `You are a content editor for a software agency (Wall-V). Merge two pieces of content into one superior article.

Rules:
1. Preserve the primary keyword focus
2. Combine the best sections from both pieces
3. Remove redundancy and repetition
4. Maintain all factual claims and technical details
5. Keep practical/code examples intact
6. Ensure the merged content flows naturally
7. Preserve heading hierarchy (H2/H3)
8. Return ONLY the merged content text — no JSON, no meta-commentary`;

  const userPrompt = `Primary article (higher quality):
Title: ${primary.title}
Content:
${(primary.content || "").slice(0, 8000)}

---

Duplicate article:
Title: ${duplicate.title}
Content:
${(duplicate.content || "").slice(0, 8000)}

---

Create a single superior merged article. Focus on: ${primary.seo?.keywords?.[0] || primary.title}`;

  const response = await adapter.chat({
    model,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    temperature: 0.3,
    maxTokens: 8192,
  });

  const mergedContent = response.content || "";

  const primaryKw = primary.seo?.keywords?.[0] || "";
  const secondaryKeywords = Array.from(
    new Set([
      ...(primary.seo?.keywords?.slice(1) || []),
      ...(duplicate.seo?.keywords || []),
    ])
  ).filter((kw) => kw !== primaryKw);

  const internalLinks = dedupeLinks([
    ...(primary.internalLinks || []).map((l) => ({
      anchorText: l.text,
      url: l.url,
    })),
    ...(duplicate.internalLinks || []).map((l) => ({
      anchorText: l.text,
      url: l.url,
    })),
  ]);

  return {
    title: primary.title,
    content: mergedContent,
    primaryKeyword: primaryKw,
    secondaryKeywords,
    qualityScore: 0,
    internalLinks,
  };
}

// ─── Auto Merge ───────────────────────────────────────────────────────────────

export async function autoMerge(
  primaryId: string,
  duplicateId: string,
  options?: { strategy?: "best_quality" | "combine_strengths" | "ai_synthesize" }
): Promise<MergedContent> {
  await connectToDatabase();

  const strategy = options?.strategy || "ai_synthesize";

  const [primaryDoc, duplicateDoc] = await Promise.all([
    ContentItem.findById(primaryId).lean(),
    ContentItem.findById(duplicateId).lean(),
  ]);

  if (!primaryDoc || !duplicateDoc) {
    throw new Error("One or both content items not found");
  }

  const primary = primaryDoc as unknown as IContentItem;
  const duplicate = duplicateDoc as unknown as IContentItem;

  let merged: MergedContent;

  if (strategy === "best_quality") {
    merged = mergeBestQuality(primary, duplicate);
  } else if (strategy === "combine_strengths") {
    merged = mergeCombineStrengths(primary, duplicate);
  } else {
    merged = await aiSynthesize(primary, duplicate);
  }

  // Run quality pipeline on merged content
  const tempItem = await ContentItem.create({
    campaign: primary.campaign,
    type: primary.type,
    platform: primary.platform,
    title: merged.title,
    content: merged.content,
    status: "draft",
    seo: {
      keywords: [merged.primaryKeyword, ...merged.secondaryKeywords].filter(Boolean),
    },
  });

  try {
    const quality = await runQualityPipeline(tempItem._id.toString());
    merged.qualityScore = quality.overallScore;
  } catch {
    merged.qualityScore = primary.qualityScores?.overall || 5;
  }

  // Update primary with merged content
  const primaryAuditEntry = {
    content: primary.content || "",
    revisedAt: new Date(),
    reason: `Merged with "${duplicate.title}" (strategy: ${strategy})`,
  };

  await ContentItem.findByIdAndUpdate(primaryId, {
    content: merged.content,
    "seo.keywords": [merged.primaryKeyword, ...merged.secondaryKeywords].filter(Boolean),
    qualityScores: {
      ...(primary.qualityScores || {}),
      overall: merged.qualityScore,
    },
    $push: { revisions: primaryAuditEntry },
  });

  // Mark duplicate as merged
  const duplicateAuditEntry = {
    content: duplicate.content || "",
    revisedAt: new Date(),
    reason: `Merged into "${primary.title}"`,
  };

  await ContentItem.findByIdAndUpdate(duplicateId, {
    title: `[MERGED INTO: ${primary.title}]`,
    status: "archived",
    $push: { revisions: duplicateAuditEntry },
  });

  return merged;
}

function mergeBestQuality(
  primary: IContentItem,
  duplicate: IContentItem
): MergedContent {
  const primaryKw = primary.seo?.keywords?.[0] || duplicate.seo?.keywords?.[0] || "";
  const secondaryKeywords = Array.from(
    new Set([
      ...(primary.seo?.keywords?.slice(1) || []),
      ...(duplicate.seo?.keywords || []),
    ])
  ).filter((kw) => kw !== primaryKw);

  // Find unique sections from duplicate that aren't in primary
  const primaryLower = (primary.content || "").toLowerCase();
  const duplicateSections = (duplicate.content || "").split(/\n\n+/);
  const uniqueSections = duplicateSections.filter((section) => {
    const sectionLower = section.toLowerCase().trim();
    if (sectionLower.length < 50) return false;
    const words = sectionLower.split(/\s+/).slice(0, 10).join(" ");
    return !primaryLower.includes(words);
  });

  const mergedContent = primary.content || "";
  const additions = uniqueSections.length > 0
    ? "\n\n## Additional Details\n\n" + uniqueSections.join("\n\n")
    : "";

  const internalLinks = dedupeLinks([
    ...(primary.internalLinks || []).map((l) => ({
      anchorText: l.text,
      url: l.url,
    })),
    ...(duplicate.internalLinks || []).map((l) => ({
      anchorText: l.text,
      url: l.url,
    })),
  ]);

  return {
    title: primary.title,
    content: mergedContent + additions,
    primaryKeyword: primaryKw,
    secondaryKeywords,
    qualityScore: primary.qualityScores?.overall || 0,
    internalLinks,
  };
}

function mergeCombineStrengths(
  primary: IContentItem,
  duplicate: IContentItem
): MergedContent {
  const primaryKw = primary.seo?.keywords?.[0] || duplicate.seo?.keywords?.[0] || "";
  const secondaryKeywords = Array.from(
    new Set([
      ...(primary.seo?.keywords?.slice(1) || []),
      ...(duplicate.seo?.keywords || []),
    ])
  ).filter((kw) => kw !== primaryKw);

  const primarySections = splitIntoSections(primary.content || "");
  const duplicateSections = splitIntoSections(duplicate.content || "");

  const mergedSections: string[] = [];
  const seenHeadings = new Set<string>();

  for (const section of primarySections) {
    const heading = extractHeading(section);
    if (heading && seenHeadings.has(heading)) continue;
    if (heading) seenHeadings.add(heading);
    mergedSections.push(section);
  }

  for (const section of duplicateSections) {
    const heading = extractHeading(section);
    if (heading && seenHeadings.has(heading)) continue;
    if (heading) seenHeadings.add(heading);
    mergedSections.push(section);
  }

  const internalLinks = dedupeLinks([
    ...(primary.internalLinks || []).map((l) => ({
      anchorText: l.text,
      url: l.url,
    })),
    ...(duplicate.internalLinks || []).map((l) => ({
      anchorText: l.text,
      url: l.url,
    })),
  ]);

  const avgQuality =
    ((primary.qualityScores?.overall || 5) +
      (duplicate.qualityScores?.overall || 5)) /
    2;

  return {
    title: primary.title,
    content: mergedSections.join("\n\n"),
    primaryKeyword: primaryKw,
    secondaryKeywords,
    qualityScore: Math.round(avgQuality * 10) / 10,
    internalLinks,
  };
}

function splitIntoSections(content: string): string[] {
  const sections = content.split(/(?=^## )/m);
  return sections.filter((s) => s.trim().length > 0);
}

function extractHeading(section: string): string | null {
  const match = section.match(/^#{1,3}\s+(.+)$/m);
  return match ? match[1].toLowerCase().trim() : null;
}

function dedupeLinks(
  links: Array<{ anchorText: string; url: string }>
): Array<{ anchorText: string; url: string }> {
  const seen = new Set<string>();
  return links.filter((link) => {
    const key = link.url.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// ─── Merge History ────────────────────────────────────────────────────────────

export async function getMergeHistory(options?: {
  campaignId?: string;
  limit?: number;
}): Promise<
  Array<{
    primary: DuplicateCandidate;
    duplicate: DuplicateCandidate;
    mergedAt: Date;
    qualityScore: number;
  }>
> {
  await connectToDatabase();

  const limit = options?.limit || 50;

  const query: Record<string, unknown> = {
    title: { $regex: /^\[MERGED INTO:/ },
  };
  if (options?.campaignId) query.campaign = options.campaignId;

  const mergedItems = await ContentItem.find(query)
    .select("title revisions campaign")
    .sort({ updatedAt: -1 })
    .limit(limit)
    .lean();

  const history: Array<{
    primary: DuplicateCandidate;
    duplicate: DuplicateCandidate;
    mergedAt: Date;
    qualityScore: number;
  }> = [];

  for (const item of mergedItems) {
    const ci = item as unknown as IContentItem;
    const mergeRevision = ci.revisions?.[ci.revisions.length - 1];
    if (!mergeRevision) continue;

    const matchResult = ci.title.match(/\[MERGED INTO: (.+)\]/);
    if (!matchResult) continue;

    const primaryTitle = matchResult[1];
    const primaryDoc = await ContentItem.findOne({ title: primaryTitle })
      .select("title type status qualityScores publishedAt seo")
      .lean();

    if (!primaryDoc) continue;

    const primaryCi = primaryDoc as unknown as IContentItem;

    history.push({
      primary: {
        id: primaryCi._id?.toString() || "",
        title: primaryCi.title,
        type: "content_item",
        contentType: primaryCi.type,
        primaryKeyword: primaryCi.seo?.keywords?.[0],
        publishedAt: primaryCi.publishedAt,
        qualityScore: primaryCi.qualityScores?.overall,
        status: primaryCi.status,
      },
      duplicate: {
        id: ci._id?.toString() || "",
        title: primaryTitle,
        type: "content_item",
        status: "archived",
      },
      mergedAt: mergeRevision.revisedAt,
      qualityScore: primaryCi.qualityScores?.overall || 0,
    });
  }

  return history;
}

// ─── Undo Merge ───────────────────────────────────────────────────────────────

export async function undoMerge(
  contentItemId: string
): Promise<{ restored: boolean; message: string }> {
  await connectToDatabase();

  const item = await ContentItem.findById(contentItemId);
  if (!item) {
    return { restored: false, message: "Content item not found" };
  }

  const ci = item as unknown as IContentItem;

  if (!ci.title.startsWith("[MERGED INTO:")) {
    return {
      restored: false,
      message: "This item was not merged — cannot undo",
    };
  }

  const matchResult = ci.title.match(/\[MERGED INTO: (.+)\]/);
  if (!matchResult) {
    return { restored: false, message: "Invalid merge marker" };
  }

  const primaryTitle = matchResult[1];

  // Find the merge revision to restore original content
  const mergeRevision = ci.revisions?.find(
    (r) => r.reason?.startsWith('Merged into "')
  );

  const originalContent = mergeRevision?.content || "";

  // Restore the duplicate
  await ContentItem.findByIdAndUpdate(contentItemId, {
    title: primaryTitle,
    status: "draft",
    content: originalContent,
  });

  // Find the primary item and check if it was merged from this duplicate
  const primaryItem = await ContentItem.findOne({ title: primaryTitle });
  if (primaryItem) {
    const undoRevision = {
      content: primaryItem.content || "",
      revisedAt: new Date(),
      reason: `Undo merge — restored duplicate "${primaryTitle}"`,
    };
    await ContentItem.findByIdAndUpdate(primaryItem._id, {
      $push: { revisions: undoRevision },
    });
  }

  return {
    restored: true,
    message: `Restored "${primaryTitle}" from merged state`,
  };
}

// ─── Batch Auto Merge ─────────────────────────────────────────────────────────

export async function batchAutoMerge(campaignId?: string): Promise<{
  merged: number;
  skipped: number;
  errors: string[];
}> {
  const groups = await findAllDuplicates({
    campaignId,
    threshold: 0.6,
  });

  let merged = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const group of groups) {
    if (group.recommendedAction !== "merge") {
      skipped++;
      continue;
    }

    for (const duplicate of group.duplicates) {
      try {
        await autoMerge(group.primary.id, duplicate.id, {
          strategy: "ai_synthesize",
        });
        merged++;
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Unknown error";
        errors.push(
          `Failed to merge "${duplicate.title}" into "${group.primary.title}": ${message}`
        );
      }
    }
  }

  return { merged, skipped, errors };
}
