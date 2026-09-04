import type { PlatformAdapter, PublishResult, SocialPost } from "./types";

export class YouTubeAdapter implements PlatformAdapter {
  name = "youtube";

  async isConnected(): Promise<boolean> {
    return false;
  }

  async publish(_post: SocialPost): Promise<PublishResult> {
    return {
      success: false,
      platform: "youtube",
      requiresAuth: true,
      error: "YouTube requires OAuth2 credentials and Data API v3 access.",
    };
  }
}
