import PublicationJob from "@/models/publication-job";
import type { IContentItem } from "@/models/content-item";
import { generateSocialVariants } from "@/lib/content-generator";
import type { PublicationPayload } from "./types";
import { canonicalUrl } from "./urls";

export interface GeneratedPost {
  content: string;
  hashtags?: string[];
  generatedBy: "ai" | "template" | "provided";
}

const PLATFORM_LIMITS: Record<string, number> = {
  x: 280,
  linkedin: 3000,
  facebook: 5000,
  instagram: 2200,
  tiktok: 2200,
  youtube: 5000,
};

const FALLBACK_HASHTAGS = ["WallV", "WebDevelopment", "SoftwareAgency"];

export function clampForPlatform(content: string, platform: string): string {
  const limit = PLATFORM_LIMITS[platform];
  if (!limit || content.length <= limit) return content;
  const sliced = content.slice(0, limit - 1);
  const lastSpace = sliced.lastIndexOf(" ");
  const base = lastSpace > limit * 0.6 ? sliced.slice(0, lastSpace) : sliced;
  return `${base.trimEnd()}…`;
}

/**
 * Deterministic, non-AI fallback post text: content/excerpt + canonical link
 * + default Wall-V hashtags. Always succeeds.
 */
export function templatePost(
  payload: PublicationPayload,
  platform: string
): GeneratedPost {
  const text = (
    payload.content ||
    payload.excerpt ||
    payload.title ||
    ""
  ).trim();
  const link =
    payload.link ||
    (payload.canonicalPath ? canonicalUrl(payload.canonicalPath) : undefined);

  const body = [text, link].filter(Boolean).join("\n\n");
  const hashtags =
    payload.hashtags && payload.hashtags.length > 0
      ? payload.hashtags
      : FALLBACK_HASHTAGS;

  return {
    content: clampForPlatform(body, platform),
    hashtags,
    generatedBy: "template",
  };
}

function hasAiCredentials(): boolean {
  return Boolean(process.env.AI_API_KEY || process.env.OPENAI_API_KEY);
}

async function generateViaAi(
  payload: PublicationPayload,
  platform: string
): Promise<GeneratedPost | null> {
  if (!hasAiCredentials()) return null;

  try {
    const itemLike = {
      title: payload.title || "",
      excerpt: payload.excerpt || payload.content || "",
      seo: { keywords: [] },
    } as unknown as IContentItem;

    const variants = await generateSocialVariants(itemLike, [platform]);
    const variant = variants.find((v) => v.platform === platform);
    if (!variant?.content) return null;

    return {
      content: clampForPlatform(variant.content, platform),
      hashtags:
        variant.hashtags && variant.hashtags.length > 0
          ? variant.hashtags
          : FALLBACK_HASHTAGS,
      generatedBy: "ai",
    };
  } catch (error) {
    const msg = error instanceof Error ? error.message : "AI generation failed";
    console.error(`[SocialPublisher] AI variant failed for ${platform}: ${msg}`);
    return null;
  }
}

/**
 * Resolves the post text for a job:
 * 1. Provided per-platform variant (existing socialVariants / enqueue payload)
 * 2. AI generation (best effort — never blocks publishing)
 * 3. Deterministic template fallback (never fails)
 *
 * AI is used for content generation only — never for authorization,
 * eligibility, or deduplication.
 */
export async function resolvePostContent(
  job: { _id: unknown; platform: string },
  payload: PublicationPayload
): Promise<GeneratedPost> {
  const variant = payload.variants?.[job.platform];
  if (variant?.content) {
    return {
      content: clampForPlatform(variant.content, job.platform),
      hashtags: variant.hashtags ?? payload.hashtags,
      generatedBy: "provided",
    };
  }

  const aiPost = await generateViaAi(payload, job.platform);
  if (aiPost) {
    try {
      await PublicationJob.updateOne(
        { _id: job._id },
        {
          $set: {
            generatedBy: "ai",
            [`payload.variants.${job.platform}`]: {
              content: aiPost.content,
              hashtags: aiPost.hashtags,
            },
          },
        }
      );
    } catch (error) {
      console.error("[SocialPublisher] failed to persist AI variant:", error);
    }
    return aiPost;
  }

  return templatePost(payload, job.platform);
}
