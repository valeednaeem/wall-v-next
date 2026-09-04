import type { PlatformAdapter, PublishResult, SocialPost } from "./types";
import { LinkedInAdapter } from "./linkedin";
import { FacebookAdapter } from "./facebook";
import { XAdapter } from "./x";
import { InstagramAdapter } from "./instagram";
import { TikTokAdapter } from "./tiktok";
import { YouTubeAdapter } from "./youtube";

const adapterCache = new Map<string, PlatformAdapter>();

function getOrCreateAdapter(platform: string): PlatformAdapter {
  const cached = adapterCache.get(platform);
  if (cached) return cached;

  let adapter: PlatformAdapter;
  switch (platform) {
    case "linkedin":
      adapter = new LinkedInAdapter();
      break;
    case "facebook":
      adapter = new FacebookAdapter();
      break;
    case "x":
      adapter = new XAdapter();
      break;
    case "instagram":
      adapter = new InstagramAdapter();
      break;
    case "tiktok":
      adapter = new TikTokAdapter();
      break;
    case "youtube":
      adapter = new YouTubeAdapter();
      break;
    default:
      throw new Error(`Unknown platform: ${platform}`);
  }

  adapterCache.set(platform, adapter);
  return adapter;
}

export function getAdapter(platform: string): PlatformAdapter {
  return getOrCreateAdapter(platform);
}

export async function publishToAll(
  post: SocialPost,
  platforms: string[]
): Promise<Record<string, PublishResult>> {
  const results: Record<string, PublishResult> = {};
  for (const platform of platforms) {
    const adapter = getAdapter(platform);
    results[platform] = await adapter.publish(post);
  }
  return results;
}

export async function getConnectionStatus(): Promise<
  Record<string, { connected: boolean; lastPublish?: Date; error?: string }>
> {
  const platforms = [
    "linkedin",
    "facebook",
    "x",
    "instagram",
    "tiktok",
    "youtube",
  ];
  const status: Record<
    string,
    { connected: boolean; lastPublish?: Date; error?: string }
  > = {};

  for (const platform of platforms) {
    const adapter = getAdapter(platform);
    try {
      const connected = await adapter.isConnected();
      status[platform] = { connected };
    } catch (error) {
      status[platform] = {
        connected: false,
        error: error instanceof Error ? error.message : "Connection check failed",
      };
    }
  }

  return status;
}

export type { PlatformAdapter, PublishResult, SocialPost };
