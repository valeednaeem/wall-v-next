import type { PlatformAdapter, PublishResult, SocialPost } from "./types";

const X_CLIENT_ID = process.env.X_CLIENT_ID || "";
const X_REDIRECT_URI = process.env.X_REDIRECT_URI || "";

export class XAdapter implements PlatformAdapter {
  name = "x";

  async isConnected(): Promise<boolean> {
    return false;
  }

  async publish(_post: SocialPost): Promise<PublishResult> {
    return {
      success: false,
      platform: "x",
      requiresAuth: true,
      error: "X/Twitter integration requires API credentials. Configure in Settings > API Keys.",
    };
  }

  getAuthUrl(): string {
    if (!X_CLIENT_ID || !X_REDIRECT_URI) {
      return "";
    }
    const params = new URLSearchParams({
      response_type: "code",
      client_id: X_CLIENT_ID,
      redirect_uri: X_REDIRECT_URI,
      scope: "tweet.read tweet.write users.read offline.access",
      state: "wall-v-x-oauth",
      code_challenge: "挑战",
      code_challenge_method: "S256",
    });
    return `https://api.x.com/2/oauth2/authorize?${params.toString()}`;
  }
}
