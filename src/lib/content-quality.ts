import { connectToDatabase } from "@/lib/mongodb";
import ContentItem, { type IContentItem } from "@/models/content-item";
import { getProviderAdapter } from "@/lib/ai-provider-adapter";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface QualityCheckResult {
  passed: boolean;
  score: number;
  issues: Array<{
    severity: "critical" | "warning" | "info";
    message: string;
    location?: string;
  }>;
  suggestions: string[];
}

// ─── Fact Check Pipeline ─────────────────────────────────────────────────────

export async function factCheck(item: IContentItem): Promise<QualityCheckResult> {
  const content = item.content || "";
  if (!content) {
    return {
      passed: false,
      score: 0,
      issues: [{ severity: "critical", message: "No content to fact-check" }],
      suggestions: ["Add content before running fact-check"],
    };
  }

  const model = process.env.AI_CONTENT_MODEL || process.env.OPENAI_MODEL || "gpt-4o";
  const adapter = getProviderAdapter(model);

  const systemPrompt = `You are a fact-checking editor for a software agency blog. Analyze the article for factual issues. Return ONLY a JSON object:
{
  "score": 0-100,
  "issues": [
    { "severity": "critical|warning|info", "message": "Description", "location": "optional paragraph/section reference" }
  ],
  "suggestions": ["Suggestion to improve factual accuracy"]
}

Check for:
1. Obviously fabricated statistics or data
2. Company announcements or product claims that seem unverifiable
3. Outdated technology claims (e.g., saying a deprecated API is current)
4. Contradictory statements within the article
5. Technical inaccuracies (wrong API names, incorrect version numbers, false capability claims)`;

  const userPrompt = `Fact-check this article:

Title: ${item.title}
Content: ${content.slice(0, 6000)}

Be strict on critical issues (fabricated stats, wrong technical claims) but lenient on minor phrasing.`;

  try {
    const result = await adapter.chat({
      model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.2,
      maxTokens: 2048,
    });

    const jsonMatch = result.content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return {
        passed: true,
        score: 70,
        issues: [{ severity: "info", message: "AI fact-check returned unstructured response" }],
        suggestions: ["Review content manually for accuracy"],
      };
    }

    const parsed = JSON.parse(jsonMatch[0]) as {
      score: number;
      issues: Array<{ severity: "critical" | "warning" | "info"; message: string; location?: string }>;
      suggestions: string[];
    };

    const hasCritical = parsed.issues.some((i) => i.severity === "critical");
    return {
      passed: !hasCritical && parsed.score >= 60,
      score: Math.min(100, Math.max(0, parsed.score)),
      issues: parsed.issues || [],
      suggestions: parsed.suggestions || [],
    };
  } catch {
    return {
      passed: true,
      score: 70,
      issues: [{ severity: "info", message: "Fact-check skipped — AI service unavailable" }],
      suggestions: ["Manually verify claims before publishing"],
    };
  }
}

// ─── SEO Review ──────────────────────────────────────────────────────────────

export async function seoReview(item: IContentItem): Promise<QualityCheckResult> {
  const issues: QualityCheckResult["issues"] = [];
  const suggestions: string[] = [];
  let score = 100;

  const title = item.title || "";
  const metaTitle = item.seo?.metaTitle || title;
  const metaDescription = item.seo?.metaDescription || "";
  const keywords = item.seo?.keywords || [];
  const primaryKeyword = keywords[0] || "";
  const content = item.content || "";

  // Title length
  if (metaTitle.length < 30) {
    issues.push({ severity: "warning", message: `Meta title too short (${metaTitle.length} chars, aim for 30-60)`, location: "metaTitle" });
    score -= 10;
  } else if (metaTitle.length > 60) {
    issues.push({ severity: "warning", message: `Meta title too long (${metaTitle.length} chars, aim for 30-60)`, location: "metaTitle" });
    score -= 10;
  }

  // Meta description length
  if (!metaDescription) {
    issues.push({ severity: "critical", message: "Missing meta description", location: "metaDescription" });
    score -= 20;
  } else if (metaDescription.length < 120) {
    issues.push({ severity: "warning", message: `Meta description too short (${metaDescription.length} chars, aim for 120-160)`, location: "metaDescription" });
    score -= 8;
  } else if (metaDescription.length > 160) {
    issues.push({ severity: "warning", message: `Meta description too long (${metaDescription.length} chars, aim for 120-160)`, location: "metaDescription" });
    score -= 8;
  }

  // Primary keyword in title
  if (primaryKeyword && !title.toLowerCase().includes(primaryKeyword.toLowerCase())) {
    issues.push({ severity: "warning", message: `Primary keyword "${primaryKeyword}" not in title`, location: "title" });
    score -= 10;
  }

  // Primary keyword in first paragraph
  if (primaryKeyword) {
    const firstParaEnd = content.indexOf("\n\n");
    const firstPara = firstParaEnd > 0 ? content.slice(0, firstParaEnd) : content.slice(0, 500);
    if (!firstPara.toLowerCase().includes(primaryKeyword.toLowerCase())) {
      issues.push({ severity: "info", message: `Primary keyword "${primaryKeyword}" not in first paragraph`, location: "firstParagraph" });
      score -= 5;
    }
  }

  // Heading hierarchy
  const h1Count = (content.match(/^# /gm) || []).length;
  const h2Count = (content.match(/^## /gm) || []).length;
  const h3Count = (content.match(/^### /gm) || []).length;

  if (h1Count === 0 && h2Count === 0) {
    issues.push({ severity: "warning", message: "No heading hierarchy found (H1/H2)" });
    score -= 10;
  }
  if (h2Count > 0 && h3Count === 0) {
    suggestions.push("Add H3 subsections under H2 headings for better structure");
  }

  // Content length
  const wordCount = content.split(/\s+/).filter(Boolean).length;
  if (item.type === "article" && wordCount < 300) {
    issues.push({ severity: "critical", message: `Content too short (${wordCount} words, minimum 300 for articles)`, location: "content" });
    score -= 25;
  } else if (item.type === "article" && wordCount < 800) {
    issues.push({ severity: "warning", message: `Content is short (${wordCount} words, recommended 1500+ for articles)`, location: "content" });
    score -= 5;
  }

  // Internal links
  if (item.type === "article") {
    const internalLinkCount = (content.match(/\[.*?\]\(\/.*?\)/g) || []).length +
      (item.internalLinks?.length || 0);
    if (internalLinkCount === 0) {
      issues.push({ severity: "warning", message: "No internal links found" });
      score -= 8;
      suggestions.push("Add 2-3 internal links to related content");
    }
  }

  // Keyword stuffing check
  if (primaryKeyword && wordCount > 0) {
    const keywordCount = (content.toLowerCase().match(new RegExp(primaryKeyword.toLowerCase(), "g")) || []).length;
    const density = (keywordCount / wordCount) * 100;
    if (density > 3) {
      issues.push({ severity: "warning", message: `Possible keyword stuffing: "${primaryKeyword}" appears ${keywordCount} times (${density.toFixed(1)}% density)`, location: "content" });
      score -= 10;
    }
  }

  // Image alt text
  const imageCount = (content.match(/!\[/g) || []).length;
  const altTextCount = (content.match(/!\[[^\]]+\]/g) || []).length;
  if (imageCount > 0 && altTextCount < imageCount) {
    issues.push({ severity: "info", message: `${imageCount - altTextCount} images missing alt text` });
    score -= 3;
  }

  const passed = score >= 50 && !issues.some((i) => i.severity === "critical");

  return {
    passed,
    score: Math.max(0, score),
    issues,
    suggestions,
  };
}

// ─── Brand Voice Review ──────────────────────────────────────────────────────

export async function brandReview(item: IContentItem): Promise<QualityCheckResult> {
  const content = item.content || "";
  if (!content) {
    return {
      passed: false,
      score: 0,
      issues: [{ severity: "critical", message: "No content for brand review" }],
      suggestions: [],
    };
  }

  const issues: QualityCheckResult["issues"] = [];
  const suggestions: string[] = [];
  let score = 100;

  // AI phrasing detection
  const aiPhrases = [
    "delve into", "in today's landscape", "game-changing", "revolutionary",
    "cutting-edge", "seamless integration", "leverage our expertise",
    "at the end of the day", "it's worth noting", "in this day and age",
    "harness the power", "unlock the potential", "drive innovation",
    "synergy", "paradigm shift", "disrupt the industry",
  ];

  const lowerContent = content.toLowerCase();
  const foundPhrases = aiPhrases.filter((p) => lowerContent.includes(p));

  if (foundPhrases.length > 0) {
    foundPhrases.forEach((phrase) => {
      issues.push({ severity: "warning", message: `Generic AI phrasing detected: "${phrase}"`, location: "content" });
      score -= 5;
    });
    suggestions.push("Replace generic AI phrasing with specific, practical language");
  }

  // Hype language
  const hypeWords = ["revolutionary", "game-changing", "world-class", "best-in-class", "unprecedented"];
  const foundHype = hypeWords.filter((w) => lowerContent.includes(w));
  if (foundHype.length > 0) {
    foundHype.forEach((word) => {
      issues.push({ severity: "info", message: `Hype language: "${word}" — prefer concrete claims`, location: "content" });
      score -= 3;
    });
  }

  // Unsupported claims
  const unsupportedPatterns = [
    /we are (the best|#1|number one|industry leaders)/i,
    /guaranteed (results|success|revenue)/i,
    /100% (satisfaction|uptime|success)/i,
  ];

  for (const pattern of unsupportedPatterns) {
    const match = content.match(pattern);
    if (match) {
      issues.push({ severity: "warning", message: `Unsupported claim: "${match[0]}"`, location: "content" });
      score -= 8;
    }
  }

  // CTA presence
  const hasCTA = /sign up|contact|get started|learn more|schedule|book|try|demo/i.test(content);
  if (!hasCTA && item.type === "article") {
    issues.push({ severity: "info", message: "No clear call-to-action found" });
    score -= 5;
    suggestions.push("Add a relevant CTA related to Wall-V services");
  }

  // Overly casual tone detection
  const casualPatterns = [
    /\b(hey guys|gonna|wanna|gotta|kinda|sorta|tbh|imo|smh)\b/i,
    /!!!/,
    /\belite\b/i,
  ];

  for (const pattern of casualPatterns) {
    if (pattern.test(content)) {
      issues.push({ severity: "info", message: "Consider a more professional tone for B2B content", location: "content" });
      score -= 3;
      break;
    }
  }

  const passed = score >= 50;

  return {
    passed,
    score: Math.max(0, score),
    issues,
    suggestions,
  };
}

// ─── Conversion Review ───────────────────────────────────────────────────────

export async function conversionReview(item: IContentItem): Promise<QualityCheckResult> {
  const content = item.content || "";
  const issues: QualityCheckResult["issues"] = [];
  const suggestions: string[] = [];
  let score = 100;

  // CTA presence
  const ctaPatterns = [
    /sign up/i, /contact us/i, /get started/i, /schedule.*call/i,
    /book.*demo/i, /try.*free/i, /learn more/i, /see.*pricing/i,
    /request.*quote/i, /start.*project/i,
  ];

  const hasCTA = ctaPatterns.some((p) => p.test(content));
  if (!hasCTA) {
    issues.push({ severity: "warning", message: "No call-to-action found in content" });
    score -= 15;
    suggestions.push("Add a CTA that directs readers to Wall-V services or contact page");
  }

  // Service/product mentions should feel natural
  const serviceMentions = (content.match(/wall-v/gi) || []).length;
  const wordCount = content.split(/\s+/).filter(Boolean).length;

  if (wordCount > 0) {
    const mentionDensity = (serviceMentions / wordCount) * 100;

    if (mentionDensity > 2) {
      issues.push({ severity: "warning", message: `Content may be overly promotional (${serviceMentions} brand mentions in ${wordCount} words)` });
      score -= 10;
      suggestions.push("Reduce brand mentions — value-first content performs better for SEO");
    } else if (serviceMentions === 0 && item.type === "article") {
      issues.push({ severity: "info", message: "No brand mentions — consider subtle integration" });
      score -= 3;
    }
  }

  // Value vs promotion ratio
  const promotionalWords = ["buy", "purchase", "hire", "subscribe", "pricing", "discount", "offer", "deal"];
  const valueWords = ["learn", "understand", "discover", "find", "solve", "improve", "optimize", "build", "create", "guide"];

  const promoCount = promotionalWords.filter((w) => lowerContentIncludes(content, w)).length;
  const valueCount = valueWords.filter((w) => lowerContentIncludes(content, w)).length;

  if (promoCount > valueCount + 2) {
    issues.push({ severity: "warning", message: "Content leans too promotional — value content should educate first" });
    score -= 8;
    suggestions.push("Shift focus to educating the reader; promote subtly in conclusion");
  }

  // Contact/signup path
  const hasContactPath = /contact|signup|sign-up|get-in-touch|reach-out/i.test(content);
  if (!hasContactPath && item.type === "article") {
    issues.push({ severity: "info", message: "No explicit contact/signup path mentioned" });
    score -= 5;
  }

  const passed = score >= 50;

  return {
    passed,
    score: Math.max(0, score),
    issues,
    suggestions,
  };
}

// ─── Full Quality Pipeline ───────────────────────────────────────────────────

export async function runQualityPipeline(
  itemId: string,
  checks?: string[]
): Promise<{ overallScore: number; results: Record<string, QualityCheckResult> }> {
  await connectToDatabase();

  const item = await ContentItem.findById(itemId).lean() as unknown as IContentItem | null;
  if (!item) {
    throw new Error("Content item not found");
  }

  const enabledChecks = checks || ["factCheck", "seoReview", "brandReview", "conversionReview"];
  const results: Record<string, QualityCheckResult> = {};

  const checkMap: Record<string, () => Promise<QualityCheckResult>> = {
    factCheck: () => factCheck(item),
    seoReview: () => seoReview(item),
    brandReview: () => brandReview(item),
    conversionReview: () => conversionReview(item),
  };

  for (const checkName of enabledChecks) {
    const checkFn = checkMap[checkName];
    if (checkFn) {
      results[checkName] = await checkFn();
    }
  }

  const overallScore = calculateOverallScore({
    research: 7,
    seo: results.seoReview?.score ? Math.round(results.seoReview.score / 10) : 7,
    originality: 7,
    factualConfidence: results.factCheck?.score ? Math.round(results.factCheck.score / 10) : 7,
    readability: results.brandReview?.score ? Math.round(results.brandReview.score / 10) : 7,
    businessRelevance: 7,
    conversionPotential: results.conversionReview?.score ? Math.round(results.conversionReview.score / 10) : 7,
    socialPotential: 7,
    videoPotential: 5,
  });

  // Update the content item with quality scores
  const allCritical = Object.values(results).some(
    (r) => r.issues.some((i) => i.severity === "critical")
  );

  const newStatus = allCritical ? "review" :
    overallScore >= 7 ? "approved" : "review";

  await ContentItem.findByIdAndUpdate(itemId, {
    qualityScores: {
      research: 7,
      seo: results.seoReview?.score ? Math.round(results.seoReview.score / 10) : 7,
      originality: 7,
      factualConfidence: results.factCheck?.score ? Math.round(results.factCheck.score / 10) : 7,
      readability: results.brandReview?.score ? Math.round(results.brandReview.score / 10) : 7,
      businessRelevance: 7,
      conversionPotential: results.conversionReview?.score ? Math.round(results.conversionReview.score / 10) : 7,
      socialPotential: 7,
      videoPotential: 5,
      overall: overallScore,
    },
    status: newStatus,
  });

  return { overallScore, results };
}

// ─── Score Calculation ───────────────────────────────────────────────────────

export function calculateOverallScore(scores: {
  research: number;
  seo: number;
  originality: number;
  factualConfidence: number;
  readability: number;
  businessRelevance: number;
  conversionPotential: number;
  socialPotential: number;
  videoPotential: number;
}): number {
  const overall =
    scores.factualConfidence * 0.25 +
    scores.seo * 0.2 +
    scores.readability * 0.15 +
    scores.businessRelevance * 0.15 +
    scores.conversionPotential * 0.1 +
    scores.originality * 0.1 +
    scores.socialPotential * 0.05;

  return Math.round(Math.min(10, Math.max(0, overall)) * 10) / 10;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function lowerContentIncludes(content: string, word: string): boolean {
  return content.toLowerCase().includes(word);
}
