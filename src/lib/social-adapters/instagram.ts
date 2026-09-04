import type { PlatformAdapter, PublishResult, SocialPost } from "./types";

export class InstagramAdapter implements PlatformAdapter {
  name = "instagram";

  async isConnected(): Promise<boolean> {
    return false;
  }

  async publish(_post: SocialPost): Promise<PublishResult> {
    return {
      success: false,
      platform: "instagram",
      requiresAuth: true,
      error: "Instagram requires a connected Facebook Business account.",
    };
  }
}
