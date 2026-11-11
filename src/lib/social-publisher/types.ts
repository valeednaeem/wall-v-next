export type ContentRefType = "blog" | "content-item";

export type ContentEventType = "published" | "updated" | "unpublished";

export type PublicationJobState =
  | "pending"
  | "processing"
  | "published"
  | "retrying"
  | "failed"
  | "cancelled"
  | "needs_review";

export type PublicationErrorCode =
  | "requires_auth"
  | "rate_limited"
  | "provider_error"
  | "exhausted"
  | "cancelled"
  | "not_eligible";

export const SOCIAL_PLATFORMS = [
  "linkedin",
  "facebook",
  "x",
  "instagram",
  "tiktok",
  "youtube",
] as const;

export type SocialPlatform = (typeof SOCIAL_PLATFORMS)[number];

export interface PublicationVariant {
  content?: string;
  hashtags?: string[];
  imageUrl?: string;
  link?: string;
}

export interface PublicationPayload {
  title?: string;
  content?: string;
  excerpt?: string;
  canonicalPath?: string;
  imageUrl?: string;
  link?: string;
  hashtags?: string[];
  variants?: Record<string, PublicationVariant>;
  relatedContentItem?: string;
  executionId?: string;
}

export interface ContentEventParams {
  type: ContentEventType;
  contentType: ContentRefType;
  contentId: string;
  payload: PublicationPayload;
  platforms?: string[];
  actorId?: string;
}
