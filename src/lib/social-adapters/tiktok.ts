import { connectToDatabase } from "@/lib/mongodb";
import SocialAccount from "@/models/socialAccount";
import type { PlatformAdapter, PublishResult, SocialPost } from "./types";

const TIKTOK_CLIENT_KEY = process.env.TIKTOK_CLIENT_KEY || "";
const TIKTOK_CLIENT_SECRET = process.env.TIKTOK_CLIENT_SECRET || "";
const TIKTOK_API_BASE = "https://open.tiktokapis.com/v2";

export class TikTokAdapter implements PlatformAdapter {
  name = "tiktok";

  async isConnected(): Promise<boolean> {
    try {
      await connectToDatabase();
      const account = await SocialAccount.findOne({ provider: "tiktok" })
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
      console.error("[TikTok] isConnected check failed:", error);
      return false;
    }
  }

  async publish(post: SocialPost): Promise<PublishResult> {
    try {
      await connectToDatabase();
      const account = await SocialAccount.findOne({ provider: "tiktok" })
        .select("+accessToken +refreshToken")
        .lean();

      if (!account || !account.accessToken) {
        return {
          success: false,
          platform: "tiktok",
          requiresAuth: true,
          error: "TikTok not connected. Connect via Settings > Social.",
        };
      }

      let accessToken = account.accessToken;

      if (account.expiresAt && new Date(account.expiresAt) < new Date()) {
        if (!account.refreshToken) {
          return {
            success: false,
            platform: "tiktok",
            requiresAuth: true,
            error: "TikTok token expired. Reconnect via Settings > Social.",
          };
        }
        const refreshed = await this.refreshToken();
        if (!refreshed) {
          return {
            success: false,
            platform: "tiktok",
            requiresAuth: true,
            error: "TikTok token refresh failed. Reconnect via Settings > Social.",
          };
        }
        const refreshedAccount = await SocialAccount.findOne({
          provider: "tiktok",
        })
          .select("+accessToken")
          .lean();
        if (!refreshedAccount?.accessToken) {
          return {
            success: false,
            platform: "tiktok",
            requiresAuth: true,
            error: "TikTok token unavailable after refresh.",
          };
        }
        accessToken = refreshedAccount.accessToken;
      }

      if (!post.imageUrl && !post.link) {
        return {
          success: false,
          platform: "tiktok",
          error: "TikTok requires a video URL. Text-only posts are not supported.",
        };
      }

      const videoUrl = post.imageUrl || post.link;
      if (!videoUrl) {
        return {
          success: false,
          platform: "tiktok",
          error: "No video URL provided for TikTok post.",
        };
      }

      const title = post.title || post.content.slice(0, 150);
      const privacyLevel = "PUBLIC_TO_EVERYONE";

      const initResponse = await fetch(
        `${TIKTOK_API_BASE}/post/publish/video/init/`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            post_info: {
              title,
              privacy_level: privacyLevel,
              disable_duet: false,
              disable_comment: false,
              disable_stitch: false,
            },
            source_info: {
              source: "URL",
              video_url: videoUrl,
            },
          }),
        }
      );

      if (!initResponse.ok) {
        const errorBody = await initResponse.json();
        console.error("[TikTok] Video init failed:", initResponse.status, errorBody);

        const tiktokError = errorBody?.error;
        const errorMessage = tiktokError?.message || JSON.stringify(errorBody);

        if (initResponse.status === 401 || initResponse.status === 403) {
          return {
            success: false,
            platform: "tiktok",
            requiresAuth: true,
            error: `TikTok authorization failed: ${errorMessage}`,
          };
        }

        return {
          success: false,
          platform: "tiktok",
          error: `TikTok API error: ${errorMessage}`,
        };
      }

      const initData = await initResponse.json();
      const publishId = initData?.data?.publish_id;

      if (!publishId) {
        return {
          success: false,
          platform: "tiktok",
          error: "TikTok did not return a publish_id.",
        };
      }

      const statusResult = await this.waitForPublish(accessToken, publishId);

      if (!statusResult.success) {
        return {
          success: false,
          platform: "tiktok",
          error: statusResult.error || "TikTok video processing failed.",
        };
      }

      return {
        success: true,
        platform: "tiktok",
        platformPostId: publishId,
        platformUrl: statusResult.videoUrl,
        publishedAt: new Date(),
      };
    } catch (error) {
      console.error("[TikTok] Publish failed:", error);
      return {
        success: false,
        platform: "tiktok",
        error: `TikTok publish error: ${error instanceof Error ? error.message : "Unknown error"}`,
      };
    }
  }

  getAuthUrl(): string {
    if (!TIKTOK_CLIENT_KEY) return "";

    const scopes = "user.info.basic,video.publish,video.list";
    const params = new URLSearchParams({
      client_key: TIKTOK_CLIENT_KEY,
      scope: scopes,
      response_type: "code",
      redirect_uri: process.env.TIKTOK_REDIRECT_URI || "",
      state: "wall-v-tiktok-oauth",
    });
    return `https://www.tiktok.com/v2/auth/authorize/?${params.toString()}`;
  }

  async refreshToken(): Promise<boolean> {
    try {
      await connectToDatabase();
      const account = await SocialAccount.findOne({ provider: "tiktok" })
        .select("+accessToken +refreshToken")
        .lean();

      if (!account?.refreshToken || !TIKTOK_CLIENT_KEY || !TIKTOK_CLIENT_SECRET)
        return false;

      const response = await fetch(
        `${TIKTOK_API_BASE}/oauth/token/`,
        {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            grant_type: "refresh_token",
            client_key: TIKTOK_CLIENT_KEY,
            client_secret: TIKTOK_CLIENT_SECRET,
            refresh_token: account.refreshToken,
          }),
        }
      );

      if (!response.ok) {
        console.error("[TikTok] Token refresh failed:", response.status);
        return false;
      }

      const data = await response.json();
      const expiresAt = new Date(Date.now() + data.expires_in * 1000);

      await SocialAccount.updateOne(
        { provider: "tiktok" },
        {
          $set: {
            accessToken: data.access_token,
            expiresAt,
            ...(data.refresh_token ? { refreshToken: data.refresh_token } : {}),
          },
        }
      );

      return true;
    } catch (error) {
      console.error("[TikTok] refreshToken error:", error);
      return false;
    }
  }

  private async waitForPublish(
    accessToken: string,
    publishId: string,
    maxAttempts: number = 15,
    delayMs: number = 3000
  ): Promise<{ success: boolean; error?: string; videoUrl?: string }> {
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));

      const response = await fetch(
        `${TIKTOK_API_BASE}/post/publish/status/?publish_id=${publishId}`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      if (!response.ok) continue;

      const data = await response.json();
      const status = data?.data?.status;

      if (status === "PUBLISH_SUCCESS") {
        const videoUrl = data?.data?.share_url;
        return { success: true, videoUrl };
      }

      if (status === "PUBLISH_FAILED") {
        return {
          success: false,
          error: data?.data?.fail_reason || "TikTok video processing failed.",
        };
      }
    }

    return {
      success: false,
      error: "TikTok video processing timed out.",
    };
  }
}
