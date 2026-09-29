import SocialAccount from "@/models/socialAccount";
import { SOCIAL_PLATFORMS } from "./types";

const PROVIDER_TO_PLATFORM: Record<string, string> = {
  linkedin: "linkedin",
  facebook: "facebook",
  x: "x",
  twitter: "x",
  instagram: "instagram",
  tiktok: "tiktok",
  youtube: "youtube",
};

export function normalizePlatform(platform: string): string | null {
  const mapped = PROVIDER_TO_PLATFORM[platform.toLowerCase().trim()];
  if (!mapped) return null;
  return (SOCIAL_PLATFORMS as readonly string[]).includes(mapped)
    ? mapped
    : null;
}

export function isSupportedPlatform(platform: string): boolean {
  return normalizePlatform(platform) !== null;
}

/**
 * Resolves target platforms for a publication:
 * 1. Explicitly requested platforms (normalized, deduped, unsupported dropped)
 * 2. Otherwise, platforms that have at least one connected social account
 *
 * Purely deterministic — no AI involved.
 */
export async function resolveTargetPlatforms(
  explicit?: string[]
): Promise<string[]> {
  if (explicit && explicit.length > 0) {
    const normalized = explicit
      .map((p) => normalizePlatform(p))
      .filter((p): p is string => p !== null);
    return Array.from(new Set(normalized));
  }

  const accounts = await SocialAccount.find({
    provider: { $in: Object.keys(PROVIDER_TO_PLATFORM) },
  })
    .select("provider")
    .lean();

  const connected = new Set(
    accounts
      .map((a) => PROVIDER_TO_PLATFORM[a.provider])
      .filter((p): p is string => Boolean(p))
  );

  return SOCIAL_PLATFORMS.filter((p) => connected.has(p));
}
