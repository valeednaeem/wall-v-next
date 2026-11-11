import type { PublicationPayload } from "./types";
import { canonicalUrl, stripHtml } from "./urls";

interface BlogPostLike {
  title: string;
  slug?: string;
  content?: string;
  excerpt?: string;
  featuredImage?: string;
}

export function blogPostPayload(post: BlogPostLike): PublicationPayload {
  const preview = post.excerpt?.trim() || stripHtml(post.content || "").slice(0, 400);
  const canonicalPath = post.slug ? `/blog/${post.slug}` : undefined;
  return {
    title: post.title,
    content: preview,
    excerpt: post.excerpt || undefined,
    canonicalPath,
    imageUrl: post.featuredImage || undefined,
    link: canonicalPath ? canonicalUrl(canonicalPath) : undefined,
  };
}

interface ContentItemLike {
  title: string;
  slug?: string;
  content?: string;
  excerpt?: string;
  featuredImage?: string;
  seo?: { canonicalUrl?: string };
  socialVariants?: { platform: string; content: string; hashtags?: string[] }[];
}

export function contentItemPayload(item: ContentItemLike): PublicationPayload {
  const variants: NonNullable<PublicationPayload["variants"]> = {};
  for (const variant of item.socialVariants || []) {
    if (!variant?.platform) continue;
    variants[variant.platform] = {
      content: variant.content,
      hashtags: variant.hashtags,
    };
  }

  const canonicalPath = item.slug ? `/blog/${item.slug}` : undefined;
  return {
    title: item.title,
    content: item.content || item.title,
    excerpt: item.excerpt || undefined,
    canonicalPath,
    imageUrl: item.featuredImage || undefined,
    link: item.seo?.canonicalUrl || (canonicalPath ? canonicalUrl(canonicalPath) : undefined),
    variants: Object.keys(variants).length > 0 ? variants : undefined,
    relatedContentItem: undefined,
  };
}
