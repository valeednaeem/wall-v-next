import { normalizeBaseUrl } from "@/lib/utils";

function getBaseUrl(): string {
  return normalizeBaseUrl(
    process.env.NEXT_PUBLIC_APP_URL ||
      process.env.APP_URL ||
      "https://www.wall-v.com"
  );
}

/** Canonical absolute URL for a site path (e.g. `/blog/my-post`). */
export function canonicalUrl(path: string): string {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${getBaseUrl()}${normalized}`;
}

/** Strips HTML tags and collapses whitespace — used for social captions. */
export function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, " ")
    .trim();
}
