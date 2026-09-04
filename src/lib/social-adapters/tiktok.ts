import type { PlatformAdapter, PublishResult, SocialPost } from "./types";

export class TikTokAdapter implements PlatformAdapter {
  name = "tiktok";

  async isConnected(): Promise<boolean> {
    return false;
  }

  async publish(_post: SocialPost): Promise<PublishResult> {
    return {
      success: false,
      platform: "tiktok",
      requiresAuth: true,
      error: "TikTok Content Publishing API requires app review approval.",
    };
  }
}
