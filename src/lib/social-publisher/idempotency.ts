import { createHash } from "crypto";
import type {
  ContentEventType,
  ContentRefType,
  PublicationPayload,
} from "./types";

function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

/**
 * Deterministic content revision fingerprint. Changes only when the
 * user-visible publishing fields change, so re-saving identical content
 * yields the same revision (and therefore the same idempotency key).
 */
export function makeRevision(payload: PublicationPayload): string {
  const material = JSON.stringify({
    title: payload.title ?? "",
    content: payload.content ?? "",
    excerpt: payload.excerpt ?? "",
    canonicalPath: payload.canonicalPath ?? "",
    imageUrl: payload.imageUrl ?? "",
    link: payload.link ?? "",
    hashtags: payload.hashtags ?? [],
    variants: payload.variants ?? {},
  });
  return sha256(material).slice(0, 16);
}

export function makeEventKey(
  type: ContentEventType,
  contentType: ContentRefType,
  contentId: string,
  revision: string
): string {
  return `${type}:${contentType}:${contentId}:${revision}`;
}

/**
 * Deterministic job key: content + revision + platform + account.
 * Enforced unique at the DB level, so the same publication is never
 * enqueued twice.
 */
export function makeIdempotencyKey(
  contentType: ContentRefType,
  contentId: string,
  revision: string,
  platform: string,
  accountId?: string
): string {
  return sha256(
    `${contentType}:${contentId}:${revision}:${platform}:${accountId ?? "default"}`
  ).slice(0, 32);
}
