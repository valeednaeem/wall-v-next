import { connectToDatabase } from "@/lib/mongodb";
import SocialAccount from "@/models/socialAccount";
import type { PlatformAdapter, PublishResult, SocialPost } from "./types";

const FACEBOOK_APP_ID = process.env.FACEBOOK_CLIENT_ID || "";
const FACEBOOK_REDIRECT_URI = process.env.FACEBOOK_REDIRECT_URI || "";

export class FacebookAdapter implements PlatformAdapter {
  name = "facebook";

  async isConnected(): Promise<boolean> {
    try {
      await connectToDatabase();
      const account = await SocialAccount.findOne({
        provider: "facebook",
      })
        .select("+accessToken +refreshToken")
        .lean();

      if (!account || !account.accessToken) return false;

      if (account.expiresAt && new Date(account.expiresAt) < new Date()) {
        if (account.refreshToken) {
          return await this.refreshToken();
        }
        return false;
      }

      return true;
    } catch (error) {
      console.error("[Facebook] isConnected check failed:", error);
      return false;
    }
  }

  async publish(post: SocialPost): Promise<PublishResult> {
    try {
      await connectToDatabase();
      const account = await SocialAccount.findOne({
        provider: "facebook",
      })
        .select("+accessToken +refreshToken")
        .lean();

      if (!account || !account.accessToken) {
        return {
          success: false,
          platform: "facebook",
          requiresAuth: true,
          error: "Facebook not connected. Connect via Settings > Social.",
        };
      }

      let accessToken = account.accessToken;

      if (account.expiresAt && new Date(account.expiresAt) < new Date()) {
        if (!account.refreshToken) {
          return {
            success: false,
            platform: "facebook",
            requiresAuth: true,
            error: "Facebook token expired. Reconnect via Settings > Social.",
          };
        }
        const refreshed = await this.refreshToken();
        if (!refreshed) {
          return {
            success: false,
            platform: "facebook",
            requiresAuth: true,
            error: "Facebook token refresh failed. Reconnect via Settings > Social.",
          };
        }
        const refreshedAccount = await SocialAccount.findOne({
          provider: "facebook",
        })
          .select("+accessToken")
          .lean();
        if (!refreshedAccount?.accessToken) {
          return {
            success: false,
            platform: "facebook",
            requiresAuth: true,
            error: "Facebook token unavailable after refresh.",
          };
        }
        accessToken = refreshedAccount.accessToken;
      }

      const pageId = await this.getPageId(account.providerId, accessToken);
      if (!pageId) {
        return {
          success: false,
          platform: "facebook",
          requiresAuth: true,
          error: "No Facebook Page found. Connect a Facebook Page to publish.",
        };
      }

      const message = post.hashtags?.length
        ? `${post.content}\n\n${post.hashtags.map((h) => `#${h}`).join(" ")}`
        : post.content;

      const params: Record<string, string> = { message, access_token: accessToken };
      if (post.link) params.link = post.link;

      const response = await fetch(
        `https://graph.facebook.com/v19.0/${pageId}/feed`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(params),
        }
      );

      if (!response.ok) {
        const errorBody = await response.json();
        console.error("[Facebook] API error:", response.status, errorBody);

        const fbError = errorBody?.error;
        const errorMessage = fbError?.message || JSON.stringify(errorBody);

        if (fbError?.code === 190 || fbError?.code === 102) {
          return {
            success: false,
            platform: "facebook",
            requiresAuth: true,
            error: `Facebook session expired: ${errorMessage}`,
          };
        }

        if (fbError?.code === 32) {
          return {
            success: false,
            platform: "facebook",
            rateLimited: true,
            error: `Facebook rate limited: ${errorMessage}`,
          };
        }

        return {
          success: false,
          platform: "facebook",
          error: `Facebook API error: ${errorMessage}`,
        };
      }

      const data = await response.json();

      return {
        success: true,
        platform: "facebook",
        platformPostId: data.id as string,
        platformUrl: `https://www.facebook.com/${pageId}/posts/${String(data.id).split("_")[1]}`,
        publishedAt: new Date(),
      };
    } catch (error) {
      console.error("[Facebook] Publish failed:", error);
      return {
        success: false,
        platform: "facebook",
        error: `Facebook publish error: ${error instanceof Error ? error.message : "Unknown error"}`,
      };
    }
  }

  getAuthUrl(): string {
    if (!FACEBOOK_APP_ID || !FACEBOOK_REDIRECT_URI) {
      return "";
    }
    const scopes = "pages_manage_posts,pages_show_list,pages_read_engagement";
    return `https://www.facebook.com/v19.0/dialog/oauth?client_id=${FACEBOOK_APP_ID}&redirect_uri=${encodeURIComponent(FACEBOOK_REDIRECT_URI)}&scope=${encodeURIComponent(scopes)}&response_type=code`;
  }

  async refreshToken(): Promise<boolean> {
    try {
      await connectToDatabase();
      const account = await SocialAccount.findOne({
        provider: "facebook",
      })
        .select("+accessToken +refreshToken")
        .lean();

      if (!account?.accessToken) return false;

      const response = await fetch(
        `https://graph.facebook.com/v19.0/oauth/access_token?grant_type=fb_exchange_token&client_id=${FACEBOOK_APP_ID}&client_secret=${process.env.FACEBOOK_CLIENT_SECRET || ""}&fb_exchange_token=${account.accessToken}`
      );

      if (!response.ok) {
        console.error("[Facebook] Token refresh failed:", response.status);
        return false;
      }

      const data = await response.json();
      const longLivedExpiry = data.expires_in || 60 * 24 * 60 * 60;
      const expiresAt = new Date(Date.now() + longLivedExpiry * 1000);

      await SocialAccount.updateOne(
        { provider: "facebook" },
        {
          $set: {
            accessToken: data.access_token,
            expiresAt,
          },
        }
      );

      return true;
    } catch (error) {
      console.error("[Facebook] refreshToken error:", error);
      return false;
    }
  }

  private async getPageId(
    userId: string,
    accessToken: string
  ): Promise<string | null> {
    try {
      const response = await fetch(
        `https://graph.facebook.com/v19.0/${userId}/accounts?access_token=${accessToken}`
      );

      if (!response.ok) return null;

      const data = await response.json();
      const pages = data.data as Array<{ id: string; name: string }>;

      return pages?.[0]?.id || null;
    } catch (error) {
      console.error("[Facebook] getPageId error:", error);
      return null;
    }
  }
}
