import { connectToDatabase } from "@/lib/mongodb";
import SocialAccount from "@/models/socialAccount";
import type { PlatformAdapter, PublishResult, SocialPost } from "./types";

const LINKEDIN_CLIENT_ID = process.env.LINKEDIN_CLIENT_ID || "";
const LINKEDIN_REDIRECT_URI = process.env.LINKEDIN_REDIRECT_URI || "";

export class LinkedInAdapter implements PlatformAdapter {
  name = "linkedin";

  async isConnected(): Promise<boolean> {
    try {
      await connectToDatabase();
      const account = await SocialAccount.findOne({
        provider: "linkedin",
      })
        .select("+accessToken +refreshToken")
        .lean();

      if (!account || !account.accessToken) return false;

      if (account.expiresAt && new Date(account.expiresAt) < new Date()) {
        if (account.refreshToken) {
          const refreshed = await this.refreshToken();
          return refreshed;
        }
        return false;
      }

      return true;
    } catch (error) {
      console.error("[LinkedIn] isConnected check failed:", error);
      return false;
    }
  }

  async publish(post: SocialPost): Promise<PublishResult> {
    try {
      await connectToDatabase();
      const account = await SocialAccount.findOne({
        provider: "linkedin",
      })
        .select("+accessToken +refreshToken")
        .lean();

      if (!account || !account.accessToken) {
        return {
          success: false,
          platform: "linkedin",
          requiresAuth: true,
          error: "LinkedIn not connected. Connect via Settings > Social.",
        };
      }

      let accessToken = account.accessToken;

      if (account.expiresAt && new Date(account.expiresAt) < new Date()) {
        if (!account.refreshToken) {
          return {
            success: false,
            platform: "linkedin",
            requiresAuth: true,
            error: "LinkedIn token expired. Reconnect via Settings > Social.",
          };
        }
        const refreshed = await this.refreshToken();
        if (!refreshed) {
          return {
            success: false,
            platform: "linkedin",
            requiresAuth: true,
            error: "LinkedIn token refresh failed. Reconnect via Settings > Social.",
          };
        }
        const refreshedAccount = await SocialAccount.findOne({
          provider: "linkedin",
        })
          .select("+accessToken")
          .lean();
        if (!refreshedAccount?.accessToken) {
          return {
            success: false,
            platform: "linkedin",
            requiresAuth: true,
            error: "LinkedIn token unavailable after refresh.",
          };
        }
        accessToken = refreshedAccount.accessToken;
      }

      const personId = account.providerId;
      const text = post.hashtags?.length
        ? `${post.content}\n\n${post.hashtags.map((h) => `#${h}`).join(" ")}`
        : post.content;

      const ugcPost: Record<string, unknown> = {
        author: `urn:li:person:${personId}`,
        lifecycleState: "PUBLISHED",
        specificContent: {
          "com.linkedin.ugc.ShareContent": {
            shareCommentary: { text },
            shareMediaCategory: post.link ? "ARTICLE" : "NONE",
          },
        },
        visibility: {
          "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC",
        },
      };

      if (post.link) {
        (ugcPost.specificContent as Record<string, unknown>)[
          "com.linkedin.ugc.ShareContent"
        ] = {
          ...(ugcPost.specificContent as Record<string, Record<string, unknown>>)[
            "com.linkedin.ugc.ShareContent"
          ],
          media: [
            {
              status: "READY",
              originalUrl: post.link,
              ...(post.title ? { title: { text: post.title } } : {}),
              ...(post.description
                ? { description: { text: post.description } }
                : {}),
            },
          ],
        };
      }

      const response = await fetch("https://api.linkedin.com/v2/ugcPosts", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
          "X-Restli-Protocol-Version": "2.0.0",
        },
        body: JSON.stringify(ugcPost),
      });

      if (!response.ok) {
        const errorBody = await response.text();
        console.error("[LinkedIn] API error:", response.status, errorBody);

        if (response.status === 429) {
          return {
            success: false,
            platform: "linkedin",
            rateLimited: true,
            error: `LinkedIn rate limited. ${errorBody}`,
          };
        }

        if (response.status === 401 || response.status === 403) {
          return {
            success: false,
            platform: "linkedin",
            requiresAuth: true,
            error: `LinkedIn authorization failed: ${errorBody}`,
          };
        }

        return {
          success: false,
          platform: "linkedin",
          error: `LinkedIn API error (${response.status}): ${errorBody}`,
        };
      }

      const data = await response.json();
      const postId = data.id as string | undefined;

      return {
        success: true,
        platform: "linkedin",
        platformPostId: postId,
        platformUrl: postId
          ? `https://www.linkedin.com/feed/update/${postId}`
          : undefined,
        publishedAt: new Date(),
      };
    } catch (error) {
      console.error("[LinkedIn] Publish failed:", error);
      return {
        success: false,
        platform: "linkedin",
        error: `LinkedIn publish error: ${error instanceof Error ? error.message : "Unknown error"}`,
      };
    }
  }

  getAuthUrl(): string {
    if (!LINKEDIN_CLIENT_ID || !LINKEDIN_REDIRECT_URI) {
      return "";
    }
    const scopes = ["w_member_social", "r_liteprofile", "r_emailaddress"];
    return `https://www.linkedin.com/oauth/v2/authorization?response_type=code&client_id=${LINKEDIN_CLIENT_ID}&redirect_uri=${encodeURIComponent(LINKEDIN_REDIRECT_URI)}&scope=${encodeURIComponent(scopes.join(" "))}`;
  }

  async refreshToken(): Promise<boolean> {
    try {
      await connectToDatabase();
      const account = await SocialAccount.findOne({
        provider: "linkedin",
      })
        .select("+accessToken +refreshToken")
        .lean();

      if (!account?.refreshToken) return false;

      const response = await fetch(
        "https://www.linkedin.com/oauth/v2/accessToken",
        {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            grant_type: "refresh_token",
            refresh_token: account.refreshToken,
            client_id: LINKEDIN_CLIENT_ID,
            client_secret: process.env.LINKEDIN_CLIENT_SECRET || "",
          }),
        }
      );

      if (!response.ok) {
        console.error("[LinkedIn] Token refresh failed:", response.status);
        return false;
      }

      const data = await response.json();
      const expiresAt = new Date(Date.now() + data.expires_in * 1000);

      await SocialAccount.updateOne(
        { provider: "linkedin" },
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
      console.error("[LinkedIn] refreshToken error:", error);
      return false;
    }
  }
}
