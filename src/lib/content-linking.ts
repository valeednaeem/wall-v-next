import { connectToDatabase } from "@/lib/mongodb";
import BlogPost from "@/models/blog-post";
import ContentItem from "@/models/content-item";
import type { IContentItem } from "@/models/content-item";
import type { IBlogPost } from "@/models/blog-post";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface LinkSuggestion {
  anchorText: string;
  url: string;
  relevance: number;
  context: string;
  existingContent: { title: string; slug: string; type: "blog" | "article" };
}

export interface ContentRelationship {
  sourceId: string;
  sourceTitle: string;
  targetId: string;
  targetTitle: string;
  relationship: "links_to" | "keyword_overlap" | "topic_sibling";
  strength: number;
}

// ─── Find Internal Link Opportunities ────────────────────────────────────────

export async function findInternalLinks(
  content: string,
  primaryKeyword: string
): Promise<LinkSuggestion[]> {
  await connectToDatabase();

  if (!content) return [];

  // Extract key phrases from content (3-5 word chunks around the primary keyword)
  const keyPhrases = extractKeyPhrases(content, primaryKeyword);

  // Search existing blog posts
  const blogPosts = await BlogPost.find({ status: "published" })
    .select("title slug content excerpt")
    .lean() as unknown as IBlogPost[];

  // Search existing content items (articles)
  const contentItems = await ContentItem.find({
    type: "article",
    status: { $in: ["published", "approved"] },
  })
    .select("title slug content excerpt")
    .lean() as unknown as IContentItem[];

  const suggestions: LinkSuggestion[] = [];
  const seenSlugs = new Set<string>();

  // Score blog posts
  for (const post of blogPosts) {
    if (seenSlugs.has(post.slug)) continue;
    seenSlugs.add(post.slug);

    const score = calculateRelevance(keyPhrases, post.title, post.content);
    if (score > 0.2) {
      // Find the best anchor text from content context
      const anchorText = findBestAnchor(content, post.title, keyPhrases);
      const contextSnippet = findContextSnippet(content, anchorText);

      suggestions.push({
        anchorText,
        url: `/blog/${post.slug}`,
        relevance: score,
        context: contextSnippet,
        existingContent: {
          title: post.title,
          slug: post.slug,
          type: "blog",
        },
      });
    }
  }

  // Score content items
  for (const item of contentItems) {
    const slug = item.slug || item.title.toLowerCase().replace(/[^a-z0-9]+/g, "-");
    if (seenSlugs.has(slug)) continue;
    seenSlugs.add(slug);

    const score = calculateRelevance(keyPhrases, item.title, item.content || "");
    if (score > 0.2) {
      const anchorText = findBestAnchor(content, item.title, keyPhrases);
      const contextSnippet = findContextSnippet(content, anchorText);

      suggestions.push({
        anchorText,
        url: `/content/${slug}`,
        relevance: score,
        context: contextSnippet,
        existingContent: {
          title: item.title,
          slug,
          type: "article",
        },
      });
    }
  }

  // Sort by relevance descending, limit to top 10
  return suggestions.sort((a, b) => b.relevance - a.relevance).slice(0, 10);
}

// ─── Suggest Backlinks for New Content ───────────────────────────────────────

export async function suggestBacklinks(
  newContentId: string
): Promise<Array<{
  existingContentId: string;
  existingContentTitle: string;
  suggestedAnchor: string;
  relevance: number;
}>> {
  await connectToDatabase();

  const newContent = await ContentItem.findById(newContentId).lean() as unknown as IContentItem | null;
  if (!newContent || !newContent.content) return [];

  const keyPhrases = extractKeyPhrases(
    newContent.content,
    newContent.seo?.keywords?.[0] || newContent.title
  );

  // Find existing published content
  const existingItems = await ContentItem.find({
    _id: { $ne: newContentId },
    type: "article",
    status: { $in: ["published", "approved"] },
  })
    .select("title slug content")
    .lean() as unknown as IContentItem[];

  const suggestions: Array<{
    existingContentId: string;
    existingContentTitle: string;
    suggestedAnchor: string;
    relevance: number;
  }> = [];

  for (const item of existingItems) {
    const score = calculateRelevance(
      keyPhrases,
      item.title,
      item.content || ""
    );

    if (score > 0.3) {
      const anchorText = findBestAnchor(
        item.content || "",
        newContent.title,
        keyPhrases
      );

      suggestions.push({
        existingContentId: item._id.toString(),
        existingContentTitle: item.title,
        suggestedAnchor: anchorText,
        relevance: score,
      });
    }
  }

  return suggestions.sort((a, b) => b.relevance - a.relevance).slice(0, 5);
}

// ─── Get Content Relationships ───────────────────────────────────────────────

export async function getContentRelationships(
  campaignId?: string
): Promise<ContentRelationship[]> {
  await connectToDatabase();

  const query: Record<string, unknown> = {
    status: { $in: ["published", "approved"] },
  };
  if (campaignId) query.campaign = campaignId;

  const items = await ContentItem.find(query)
    .select("title slug content internalLinks campaign")
    .lean() as unknown as IContentItem[];

  const relationships: ContentRelationship[] = [];
  const seenPairs = new Set<string>();

  // Map direct links
  for (const item of items) {
    if (!item.internalLinks?.length) continue;

    for (const link of item.internalLinks) {
      const target = items.find(
        (i) => i.slug && link.url.includes(i.slug)
      );
      if (!target) continue;

      const pairKey = [item._id.toString(), target._id.toString()].sort().join(":");
      if (seenPairs.has(pairKey)) continue;
      seenPairs.add(pairKey);

      relationships.push({
        sourceId: item._id.toString(),
        sourceTitle: item.title,
        targetId: target._id.toString(),
        targetTitle: target.title,
        relationship: "links_to",
        strength: 1,
      });
    }
  }

  // Map keyword overlaps (for cannibalization detection)
  for (let i = 0; i < items.length; i++) {
    for (let j = i + 1; j < items.length; j++) {
      const pairKey = [items[i]._id.toString(), items[j]._id.toString()].sort().join(":");
      if (seenPairs.has(pairKey)) continue;

      const overlap = calculateKeywordOverlap(
        items[i].seo?.keywords || [],
        items[j].seo?.keywords || []
      );

      if (overlap > 0.6) {
        seenPairs.add(pairKey);
        relationships.push({
          sourceId: items[i]._id.toString(),
          sourceTitle: items[i].title,
          targetId: items[j]._id.toString(),
          targetTitle: items[j].title,
          relationship: "keyword_overlap",
          strength: overlap,
        });
      }
    }
  }

  return relationships;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function extractKeyPhrases(content: string, primaryKeyword: string): string[] {
  const phrases: string[] = [];

  if (primaryKeyword) {
    phrases.push(primaryKeyword.toLowerCase());
  }

  // Extract noun phrases from headings
  const headings = content.match(/^#{1,3}\s+(.+)$/gm) || [];
  for (const heading of headings) {
    const text = heading.replace(/^#{1,3}\s+/, "").toLowerCase().trim();
    if (text.length > 3 && text.length < 60) {
      phrases.push(text);
    }
  }

  // Extract bold text as key phrases
  const boldText = content.match(/\*\*(.+?)\*\*/g) || [];
  for (const bold of boldText.slice(0, 10)) {
    const text = bold.replace(/\*\*/g, "").toLowerCase().trim();
    if (text.length > 3 && text.length < 50) {
      phrases.push(text);
    }
  }

  return Array.from(new Set(phrases)).slice(0, 15);
}

function calculateRelevance(
  keyPhrases: string[],
  targetTitle: string,
  targetContent: string
): number {
  const targetText = `${targetTitle} ${targetContent}`.toLowerCase();
  let matches = 0;

  for (const phrase of keyPhrases) {
    if (targetText.includes(phrase)) {
      matches++;
    }
  }

  return keyPhrases.length > 0 ? matches / keyPhrases.length : 0;
}

function findBestAnchor(
  sourceContent: string,
  targetTitle: string,
  keyPhrases: string[]
): string {
  // Try to find target title mentioned in source content
  const titleMention = sourceContent.match(
    new RegExp(`[^.]*\\b${escapeRegex(targetTitle.toLowerCase())}\\b[^.]*\\.`, "i")
  );
  if (titleMention) {
    return targetTitle;
  }

  // Find a key phrase that appears in both
  for (const phrase of keyPhrases) {
    if (sourceContent.toLowerCase().includes(phrase)) {
      return phrase;
    }
  }

  return targetTitle;
}

function findContextSnippet(content: string, anchorText: string): string {
  const idx = content.toLowerCase().indexOf(anchorText.toLowerCase());
  if (idx === -1) return "";

  const start = Math.max(0, idx - 80);
  const end = Math.min(content.length, idx + anchorText.length + 80);
  const snippet = content.slice(start, end).trim();

  return (start > 0 ? "..." : "") + snippet + (end < content.length ? "..." : "");
}

function calculateKeywordOverlap(
  keywordsA: string[],
  keywordsB: string[]
): number {
  if (keywordsA.length === 0 || keywordsB.length === 0) return 0;

  const setA = new Set(keywordsA.map((k) => k.toLowerCase()));
  const setB = new Set(keywordsB.map((k) => k.toLowerCase()));

  let overlap = 0;
  setA.forEach((kw) => {
    if (setB.has(kw)) overlap++;
  });

  const unionSize = new Set(Array.from(setA).concat(Array.from(setB))).size;
  return unionSize > 0 ? overlap / unionSize : 0;
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
