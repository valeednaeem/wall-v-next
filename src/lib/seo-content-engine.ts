import { connectToDatabase } from "@/lib/mongodb";
import ContentItem from "@/models/content-item";
import BlogPost from "@/models/blog-post";
import type { IContentItem } from "@/models/content-item";
import { getProviderAdapter } from "@/lib/ai-provider-adapter";
import { marked } from "marked";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SEOStrategy {
  primaryKeyword: string;
  secondaryKeywords: string[];
  longTailKeywords: string[];
  searchIntent: string;
  competitorGap: string[];
  contentStructure: {
    suggestedHeadings: string[];
    wordCountTarget: number;
    readTimeMinutes: number;
  };
  schemaType: string;
  internalLinkTargets: string[];
}

export interface SEOAuditResult {
  score: number;
  issues: { severity: "critical" | "warning" | "info"; message: string; fix?: string }[];
  recommendations: string[];
  keywordDensity: Record<string, number>;
  readabilityGrade: string;
}

// ─── SEO Research ─────────────────────────────────────────────────────────────

export async function generateSEOStrategy(params: {
  topic: string;
  primaryKeyword: string;
  secondaryKeywords?: string[];
  campaignGoal?: string;
}): Promise<SEOStrategy> {
  const model = process.env.AI_CONTENT_MODEL || process.env.OPENAI_MODEL || "gpt-4o";
  const adapter = getProviderAdapter(model);

  const systemPrompt = `You are an SEO strategist for Wall-V, a software agency. Analyze the topic and produce an SEO strategy. Return ONLY a JSON object:
{
  "primaryKeyword": "optimized primary keyword",
  "secondaryKeywords": ["keyword1", "keyword2", "keyword3"],
  "longTailKeywords": ["long tail 1", "long tail 2", "long tail 3"],
  "searchIntent": "informational|commercial|transactional|navigational",
  "competitorGap": ["angle competitors miss 1", "angle 2"],
  "contentStructure": {
    "suggestedHeadings": ["H2 1", "H2 2", "H2 3", "H2 4"],
    "wordCountTarget": 2000,
    "readTimeMinutes": 8
  },
  "schemaType": "Article|HowTo|FAQPage|TechArticle",
  "internalLinkTargets": ["related service page slug 1", "related blog topic 2"]
}`;

  const userPrompt = `Topic: ${params.topic}
Primary Keyword: ${params.primaryKeyword}
Secondary Keywords: ${params.secondaryKeywords?.join(", ") || "N/A"}
Campaign Goal: ${params.campaignGoal || "Drive organic traffic and leads"}

Optimize the primary keyword for search. Suggest long-tail variations. Identify content gaps competitors aren't filling. Recommend the best structured data schema type.`;

  const result = await adapter.chat({
    model,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    temperature: 0.5,
    maxTokens: 1500,
  });

  try {
    const content = result.content.trim();
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No JSON found");
    return JSON.parse(jsonMatch[0]) as SEOStrategy;
  } catch {
    return {
      primaryKeyword: params.primaryKeyword,
      secondaryKeywords: params.secondaryKeywords || [],
      longTailKeywords: [],
      searchIntent: "informational",
      competitorGap: [],
      contentStructure: {
        suggestedHeadings: [],
        wordCountTarget: 2000,
        readTimeMinutes: 8,
      },
      schemaType: "Article",
      internalLinkTargets: [],
    };
  }
}

// ─── Insert Internal Links Into Content ────────────────────────────────────────

export function insertInternalLinks(
  content: string,
  links: Array<{ text: string; url: string }>,
  maxLinks: number = 5
): string {
  if (!content || !links || links.length === 0) return content;

  let modifiedContent = content;
  let insertedCount = 0;
  const usedAnchors = new Set<string>();

  for (const link of links) {
    if (insertedCount >= maxLinks) break;
    if (!link.text || !link.url) continue;
    if (usedAnchors.has(link.text.toLowerCase())) continue;

    // Skip if link text already has a markdown link
    if (modifiedContent.includes(`[${link.text}]`)) continue;

    // Find the first occurrence of the anchor text that isn't already in a link
    const escapedText = link.text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const plainTextRegex = new RegExp(`(?<!\\[)${escapedText}(?!\\])`, "i");
    const match = modifiedContent.match(plainTextRegex);

    if (match && match.index !== undefined) {
      const before = modifiedContent.slice(0, match.index);
      const after = modifiedContent.slice(match.index + match[0].length);

      // Don't insert links inside headings or existing markdown links
      const lastNewline = before.lastIndexOf("\n");
      const currentLine = before.slice(lastNewline + 1);
      if (currentLine.startsWith("#") || currentLine.includes("](")) {
        continue;
      }

      modifiedContent = `${before}[${match[0]}](${link.url})${after}`;
      usedAnchors.add(link.text.toLowerCase());
      insertedCount++;
    }
  }

  return modifiedContent;
}

// ─── SEO Content Audit ────────────────────────────────────────────────────────

export async function runSEOAudit(contentItemId: string): Promise<SEOAuditResult> {
  await connectToDatabase();

  const item = await ContentItem.findById(contentItemId).lean() as unknown as IContentItem | null;
  if (!item) throw new Error("Content item not found");

  const content = item.content || "";
  const seo = item.seo;
  const issues: SEOAuditResult["issues"] = [];
  const recommendations: string[] = [];

  // Meta title check
  if (!seo?.metaTitle) {
    issues.push({ severity: "critical", message: "Missing meta title", fix: "Add a meta title (30-60 chars)" });
  } else if (seo.metaTitle.length < 30) {
    issues.push({ severity: "warning", message: `Meta title too short (${seo.metaTitle.length} chars, min 30)`, fix: "Expand to 30-60 characters" });
  } else if (seo.metaTitle.length > 60) {
    issues.push({ severity: "warning", message: `Meta title too long (${seo.metaTitle.length} chars, max 60)`, fix: "Trim to 60 characters" });
  }

  // Meta description check
  if (!seo?.metaDescription) {
    issues.push({ severity: "critical", message: "Missing meta description", fix: "Add a meta description (120-160 chars)" });
  } else if (seo.metaDescription.length < 120) {
    issues.push({ severity: "warning", message: `Meta description too short (${seo.metaDescription.length} chars, min 120)`, fix: "Expand to 120-160 characters" });
  } else if (seo.metaDescription.length > 160) {
    issues.push({ severity: "warning", message: `Meta description too long (${seo.metaDescription.length} chars, max 160)`, fix: "Trim to 160 characters" });
  }

  // Keyword checks
  const primaryKeyword = seo?.keywords?.[0] || "";
  if (!primaryKeyword) {
    issues.push({ severity: "critical", message: "No primary keyword defined", fix: "Set the first keyword as primary" });
  } else {
    const contentLower = content.toLowerCase();
    const keywordLower = primaryKeyword.toLowerCase();

    // Keyword in first paragraph
    const firstParagraph = content.split("\n\n")[0]?.toLowerCase() || "";
    if (!firstParagraph.includes(keywordLower)) {
      issues.push({ severity: "warning", message: "Primary keyword not in first paragraph", fix: `Include "${primaryKeyword}" naturally in the opening` });
    }

    // Keyword density
    const wordCount = content.split(/\s+/).length;
    const keywordCount = (contentLower.match(new RegExp(keywordLower.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g")) || []).length;
    const density = wordCount > 0 ? (keywordCount / wordCount) * 100 : 0;

    if (density > 3) {
      issues.push({ severity: "warning", message: `Keyword density too high (${density.toFixed(1)}%, max 3%)`, fix: "Reduce keyword frequency or use synonyms" });
    } else if (density < 0.5 && wordCount > 500) {
      issues.push({ severity: "info", message: `Keyword density low (${density.toFixed(1)}%)`, fix: "Consider using the keyword more naturally" });
    }
  }

  // Heading structure
  const h2Count = (content.match(/^## /gm) || []).length;
  const h3Count = (content.match(/^### /gm) || []).length;
  if (h2Count === 0) {
    issues.push({ severity: "warning", message: "No H2 headings found", fix: "Add 3-5 H2 sections for better structure" });
  }
  if (h3Count === 0 && h2Count > 2) {
    issues.push({ severity: "info", message: "No H3 subheadings", fix: "Add H3 subsections under complex H2s" });
  }

  // Word count
  const wordCount = content.split(/\s+/).filter(Boolean).length;
  if (wordCount < 300) {
    issues.push({ severity: "critical", message: `Content too short (${wordCount} words, min 300)`, fix: "Expand to at least 1500 words for SEO value" });
  } else if (wordCount < 1500) {
    issues.push({ severity: "warning", message: `Content thin (${wordCount} words, recommended 1500+)`, fix: "Add more depth, examples, and sections" });
  }

  // Internal links
  const internalLinkCount = (content.match(/\[.*?\]\(\/.*?\)/g) || []).length;
  if (internalLinkCount === 0) {
    issues.push({ severity: "warning", message: "No internal links found", fix: "Add 2-5 internal links to related content" });
  }

  // External links
  const externalLinkCount = (content.match(/\[.*?\]\(https?:\/\/.*?\)/g) || []).length;
  if (externalLinkCount === 0) {
    issues.push({ severity: "info", message: "No external links", fix: "Consider linking to authoritative sources" });
  }

  // Image alt text
  const images = content.match(/!\[.*?\]\(.*?\)/g) || [];
  const imagesWithoutAlt = images.filter((img) => img.startsWith("![]("));
  if (images.length > 0 && imagesWithoutAlt.length > 0) {
    issues.push({ severity: "warning", message: `${imagesWithoutAlt.length} images missing alt text`, fix: "Add descriptive alt text to all images" });
  }

  // Calculate score
  let score = 100;
  for (const issue of issues) {
    if (issue.severity === "critical") score -= 15;
    else if (issue.severity === "warning") score -= 8;
    else score -= 3;
  }
  score = Math.max(0, Math.min(100, score));

  // Keyword density map
  const keywordDensity: Record<string, number> = {};
  if (primaryKeyword) {
    const wordCount = content.split(/\s+/).length;
    const count = (content.toLowerCase().match(new RegExp(primaryKeyword.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g")) || []).length;
    keywordDensity[primaryKeyword] = wordCount > 0 ? parseFloat(((count / wordCount) * 100).toFixed(2)) : 0;
  }

  return {
    score,
    issues,
    recommendations,
    keywordDensity,
    readabilityGrade: estimateReadabilityGrade(content),
  };
}

// ─── Enhance SEO Metadata ─────────────────────────────────────────────────────

export async function enhanceSEOMetadata(contentItemId: string): Promise<void> {
  await connectToDatabase();

  const item = await ContentItem.findById(contentItemId) as unknown as IContentItem | null;
  if (!item || !item.content) return;

  const model = process.env.AI_CONTENT_MODEL || process.env.OPENAI_MODEL || "gpt-4o";
  const adapter = getProviderAdapter(model);

  const systemPrompt = `You are an SEO metadata optimizer. Improve the meta title and description for maximum click-through rate. Return ONLY a JSON object:
{
  "metaTitle": "Improved title (30-60 chars, include primary keyword)",
  "metaDescription": "Improved description (120-160 chars, compelling, include keyword + CTA hint)",
  "keywords": ["optimized", "keyword", "list"]
}`;

  const userPrompt = `Current article:
Title: ${item.title}
Primary Keyword: ${item.seo?.keywords?.[0] || item.title}
Current Meta Title: ${item.seo?.metaTitle || "none"}
Current Meta Description: ${item.seo?.metaDescription || "none"}
Excerpt: ${item.excerpt || "N/A"}

First 200 words: ${(item.content || "").slice(0, 200)}

Optimize for search click-through rate. Make it compelling but accurate.`;

  const result = await adapter.chat({
    model,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    temperature: 0.4,
    maxTokens: 500,
  });

  try {
    const content = result.content.trim();
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return;
    const parsed = JSON.parse(jsonMatch[0]);

    await ContentItem.findByIdAndUpdate(contentItemId, {
      $set: {
        "seo.metaTitle": parsed.metaTitle || item.seo?.metaTitle,
        "seo.metaDescription": parsed.metaDescription || item.seo?.metaDescription,
        "seo.keywords": parsed.keywords || item.seo?.keywords,
      },
    });
  } catch {
    // Enhancement failed silently — keep original metadata
  }
}

// ─── Generate JSON-LD Schema ──────────────────────────────────────────────────

export function generateArticleSchema(item: IContentItem, baseUrl: string): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: item.title,
    description: item.excerpt || item.seo?.metaDescription,
    author: {
      "@type": "Organization",
      name: "Wall-V",
      url: baseUrl,
    },
    publisher: {
      "@type": "Organization",
      name: "Wall-V",
      url: baseUrl,
    },
    datePublished: item.createdAt?.toISOString(),
    dateModified: item.updatedAt?.toISOString(),
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": `${baseUrl}/blog/${item.slug}`,
    },
    keywords: item.seo?.keywords?.join(", "),
    inLanguage: "en-US",
  };
}

export function generateFAQSchema(faqs: Array<{ question: string; answer: string }>): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.answer,
      },
    })),
  };
}

// ─── Content Freshness ────────────────────────────────────────────────────────

export function addFreshnessSignal(content: string, updatedAt: Date): string {
  const dateStr = updatedAt.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const freshnessNote = `\n\n---\n*Last updated: ${dateStr}*\n`;

  // Remove existing freshness signal if present
  const cleaned = content.replace(/\n\n---\n\*Last updated:.*?\*\n$/, "");

  return cleaned + freshnessNote;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function estimateReadabilityGrade(content: string): string {
  const sentences = content.split(/[.!?]+/).filter((s) => s.trim().length > 0);
  const words = content.split(/\s+/).filter((w) => w.length > 0);
  const syllables = words.reduce((count, word) => count + countSyllables(word), 0);

  if (sentences.length === 0 || words.length === 0) return "N/A";

  const avgWordsPerSentence = words.length / sentences.length;
  const avgSyllablesPerWord = syllables / words.length;

  // Flesch-Kincaid Grade Level
  const grade = 0.39 * avgWordsPerSentence + 11.8 * avgSyllablesPerWord - 15.59;

  if (grade < 6) return "Easy (Grade 5-6)";
  if (grade < 8) return "Standard (Grade 7-8)";
  if (grade < 10) return "Moderate (Grade 9-10)";
  if (grade < 12) return "Complex (Grade 11-12)";
  return "Advanced (Grade 12+)";
}

function countSyllables(word: string): number {
  const w = word.toLowerCase().replace(/[^a-z]/g, "");
  if (w.length <= 3) return 1;

  let count = 0;
  const vowels = "aeiouy";
  let prevVowel = false;

  for (const char of w) {
    const isVowel = vowels.includes(char);
    if (isVowel && !prevVowel) count++;
    prevVowel = isVowel;
  }

  if (w.endsWith("e")) count--;
  return Math.max(1, count);
}
