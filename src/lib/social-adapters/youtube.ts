import { connectToDatabase } from "@/lib/mongodb";
import SocialAccount from "@/models/socialAccount";
import type { PlatformAdapter, PublishResult, SocialPost } from "./types";

const YOUTUBE_CLIENT_ID = process.env.YOUTUBE_CLIENT_ID || "";
const YOUTUBE_CLIENT_SECRET = process.env.YOUTUBE_CLIENT_SECRET || "";
const YOUTUBE_UPLOAD_BASE = "https://www.googleapis.com/upload/youtube/v3";

export class YouTubeAdapter implements PlatformAdapter {
  name = "youtube";

  async isConnected(): Promise<boolean> {
    try {
      await connectToDatabase();
      const account = await SocialAccount.findOne({ provider: "youtube" })
        .select("+accessToken +refreshToken")
        .lean();

      if (!account || !account.accessToken) return false;
      if (!account.providerId) return false;

      if (account.expiresAt && new Date(account.expiresAt) < new Date()) {
        if (account.refreshToken) {
          return await this.refreshToken();
        }
        return false;
      }

      return true;
    } catch (error) {
      console.error("[YouTube] isConnected check failed:", error);
      return false;
    }
  }

  async publish(post: SocialPost): Promise<PublishResult> {
    try {
      await connectToDatabase();
      const account = await SocialAccount.findOne({ provider: "youtube" })
        .select("+accessToken +refreshToken")
        .lean();

      if (!account || !account.accessToken) {
        return {
          success: false,
          platform: "youtube",
          requiresAuth: true,
          error: "YouTube not connected. Connect via Settings > Social.",
        };
      }

      if (!account.providerId) {
        return {
          success: false,
          platform: "youtube",
          requiresAuth: true,
          error: "YouTube channel ID not found. Reconnect via Settings > Social.",
        };
      }

      let accessToken = account.accessToken;

      if (account.expiresAt && new Date(account.expiresAt) < new Date()) {
        if (!account.refreshToken) {
          return {
            success: false,
            platform: "youtube",
            requiresAuth: true,
            error: "YouTube token expired. Reconnect via Settings > Social.",
          };
        }
        const refreshed = await this.refreshToken();
        if (!refreshed) {
          return {
            success: false,
            platform: "youtube",
            requiresAuth: true,
            error: "YouTube token refresh failed. Reconnect via Settings > Social.",
          };
        }
        const refreshedAccount = await SocialAccount.findOne({
          provider: "youtube",
        })
          .select("+accessToken")
          .lean();
        if (!refreshedAccount?.accessToken) {
          return {
            success: false,
            platform: "youtube",
            requiresAuth: true,
            error: "YouTube token unavailable after refresh.",
          };
        }
        accessToken = refreshedAccount.accessToken;
      }

      const videoUrl = post.imageUrl || post.link;
      if (!videoUrl) {
        return {
          success: false,
          platform: "youtube",
          error: "YouTube requires a video URL. Text-only posts are not supported.",
        };
      }

      const title = post.title || post.content.slice(0, 100);
      const description = post.hashtags?.length
        ? `${post.content}\n\n${post.hashtags.map((h) => `#${h}`).join(" ")}`
        : post.content;

      const tags = post.hashtags || [];

      const metadata = {
        snippet: {
          title,
          description: description.slice(0, 5000),
          tags,
          categoryId: "22",
        },
        status: {
          privacyStatus: "public",
          selfDeclaredMadeForKids: false,
        },
      };

      const uploadResponse = await fetch(
        `${YOUTUBE_UPLOAD_BASE}/videos?uploadType=resumable&part=snippet,status`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
            "X-Upload-Content-Type": "video/mp4",
          },
          body: JSON.stringify(metadata),
        }
      );

      if (!uploadResponse.ok) {
        const errorBody = await uploadResponse.json();
        console.error("[YouTube] Upload init failed:", uploadResponse.status, errorBody);

        const ytError = errorBody?.error;
        const errorMessage = ytError?.message || JSON.stringify(errorBody);

        if (uploadResponse.status === 401 || uploadResponse.status === 403) {
          return {
            success: false,
            platform: "youtube",
            requiresAuth: true,
            error: `YouTube authorization failed: ${errorMessage}`,
          };
        }

        return {
          success: false,
          platform: "youtube",
          error: `YouTube API error: ${errorMessage}`,
        };
      }

      const uploadUrl = uploadResponse.headers.get("Location");
      if (!uploadUrl) {
        return {
          success: false,
          platform: "youtube",
          error: "YouTube did not return an upload URL.",
        };
      }

      const videoResponse = await fetch(videoUrl);
      if (!videoResponse.ok) {
        return {
          success: false,
          platform: "youtube",
          error: `Failed to fetch video from URL: ${videoUrl}`,
        };
      }

      const videoBuffer = Buffer.from(await videoResponse.arrayBuffer());

      const commitResponse = await fetch(uploadUrl, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "video/mp4",
          "Content-Length": String(videoBuffer.length),
        },
        body: videoBuffer,
      });

      if (!commitResponse.ok) {
        const errorBody = await commitResponse.json();
        console.error("[YouTube] Video commit failed:", commitResponse.status, errorBody);
        return {
          success: false,
          platform: "youtube",
          error: `YouTube video upload failed: ${errorBody?.error?.message || "Unknown error"}`,
        };
      }

      const commitData = await commitResponse.json();
      const videoId = commitData?.id;

      return {
        success: true,
        platform: "youtube",
        platformPostId: videoId,
        platformUrl: videoId ? `https://www.youtube.com/watch?v=${videoId}` : undefined,
        publishedAt: new Date(),
      };
    } catch (error) {
      console.error("[YouTube] Publish failed:", error);
      return {
        success: false,
        platform: "youtube",
        error: `YouTube publish error: ${error instanceof Error ? error.message : "Unknown error"}`,
      };
    }
  }

  getAuthUrl(): string {
    if (!YOUTUBE_CLIENT_ID) return "";

    const scopes = [
      "https://www.googleapis.com/auth/youtube.upload",
      "https://www.googleapis.com/auth/youtube",
      "https://www.googleapis.com/auth/youtube.force-ssl",
    ];
    const params = new URLSearchParams({
      client_id: YOUTUBE_CLIENT_ID,
      redirect_uri: process.env.YOUTUBE_REDIRECT_URI || "",
      response_type: "code",
      scope: scopes.join(" "),
      access_type: "offline",
      prompt: "consent",
    });
    return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  }

  async refreshToken(): Promise<boolean> {
    try {
      await connectToDatabase();
      const account = await SocialAccount.findOne({ provider: "youtube" })
        .select("+accessToken +refreshToken")
        .lean();

      if (!account?.refreshToken || !YOUTUBE_CLIENT_ID || !YOUTUBE_CLIENT_SECRET)
        return false;

      const response = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          grant_type: "refresh_token",
          refresh_token: account.refreshToken,
          client_id: YOUTUBE_CLIENT_ID,
          client_secret: YOUTUBE_CLIENT_SECRET,
        }),
      });

      if (!response.ok) {
        console.error("[YouTube] Token refresh failed:", response.status);
        return false;
      }

      const data = await response.json();
      const expiresAt = new Date(Date.now() + data.expires_in * 1000);

      await SocialAccount.updateOne(
        { provider: "youtube" },
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
      console.error("[YouTube] refreshToken error:", error);
      return false;
    }
  }
}
