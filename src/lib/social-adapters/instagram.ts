import { connectToDatabase } from "@/lib/mongodb";
import SocialAccount from "@/models/socialAccount";
import type { PlatformAdapter, PublishResult, SocialPost } from "./types";

const INSTAGRAM_APP_ID = process.env.INSTAGRAM_APP_ID || "";
const INSTAGRAM_APP_SECRET = process.env.INSTAGRAM_APP_SECRET || "";
const GRAPH_API_VERSION = "v19.0";
const GRAPH_API_BASE = `https://graph.facebook.com/${GRAPH_API_VERSION}`;

export class InstagramAdapter implements PlatformAdapter {
  name = "instagram";

  async isConnected(): Promise<boolean> {
    try {
      await connectToDatabase();
      const account = await SocialAccount.findOne({ provider: "instagram" })
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
      console.error("[Instagram] isConnected check failed:", error);
      return false;
    }
  }

  async publish(post: SocialPost): Promise<PublishResult> {
    try {
      await connectToDatabase();
      const account = await SocialAccount.findOne({ provider: "instagram" })
        .select("+accessToken +refreshToken")
        .lean();

      if (!account || !account.accessToken) {
        return {
          success: false,
          platform: "instagram",
          requiresAuth: true,
          error: "Instagram not connected. Connect via Settings > Social.",
        };
      }

      if (!account.providerId) {
        return {
          success: false,
          platform: "instagram",
          requiresAuth: true,
          error: "Instagram business account ID not found. Reconnect via Settings > Social.",
        };
      }

      let accessToken = account.accessToken;

      if (account.expiresAt && new Date(account.expiresAt) < new Date()) {
        if (!account.refreshToken) {
          return {
            success: false,
            platform: "instagram",
            requiresAuth: true,
            error: "Instagram token expired. Reconnect via Settings > Social.",
          };
        }
        const refreshed = await this.refreshToken();
        if (!refreshed) {
          return {
            success: false,
            platform: "instagram",
            requiresAuth: true,
            error: "Instagram token refresh failed. Reconnect via Settings > Social.",
          };
        }
        const refreshedAccount = await SocialAccount.findOne({
          provider: "instagram",
        })
          .select("+accessToken")
          .lean();
        if (!refreshedAccount?.accessToken) {
          return {
            success: false,
            platform: "instagram",
            requiresAuth: true,
            error: "Instagram token unavailable after refresh.",
          };
        }
        accessToken = refreshedAccount.accessToken;
      }

      const igUserId = account.providerId;
      const caption = post.hashtags?.length
        ? `${post.content}\n\n${post.hashtags.map((h) => `#${h}`).join(" ")}`
        : post.content;

      if (post.imageUrl) {
        return await this.publishImage(igUserId, accessToken, post.imageUrl, caption);
      }

      const textImageUrl = await createTextImage(caption);
      if (!textImageUrl) {
        return {
          success: false,
          platform: "instagram",
          error: "Failed to generate image for text-only Instagram post.",
        };
      }
      return await this.publishImage(igUserId, accessToken, textImageUrl, caption);
    } catch (error) {
      console.error("[Instagram] Publish failed:", error);
      return {
        success: false,
        platform: "instagram",
        error: `Instagram publish error: ${error instanceof Error ? error.message : "Unknown error"}`,
      };
    }
  }

  getAuthUrl(): string {
    if (!INSTAGRAM_APP_ID) return "";

    const scopes = "instagram_basic,instagram_content_publish,pages_show_list,pages_read_engagement";
    return `https://www.facebook.com/${GRAPH_API_VERSION}/dialog/oauth?client_id=${INSTAGRAM_APP_ID}&redirect_uri=${encodeURIComponent(process.env.INSTAGRAM_REDIRECT_URI || "")}&scope=${encodeURIComponent(scopes)}&response_type=code`;
  }

  async refreshToken(): Promise<boolean> {
    try {
      await connectToDatabase();
      const account = await SocialAccount.findOne({ provider: "instagram" })
        .select("+accessToken +refreshToken")
        .lean();

      if (!account?.accessToken || !INSTAGRAM_APP_ID || !INSTAGRAM_APP_SECRET)
        return false;

      const response = await fetch(
        `${GRAPH_API_BASE}/oauth/access_token?grant_type=fb_exchange_token&client_id=${INSTAGRAM_APP_ID}&client_secret=${INSTAGRAM_APP_SECRET}&fb_exchange_token=${account.accessToken}`
      );

      if (!response.ok) {
        console.error("[Instagram] Token refresh failed:", response.status);
        return false;
      }

      const data = await response.json();
      const longLivedExpiry = data.expires_in || 60 * 24 * 60 * 60;
      const expiresAt = new Date(Date.now() + longLivedExpiry * 1000);

      await SocialAccount.updateOne(
        { provider: "instagram" },
        {
          $set: {
            accessToken: data.access_token,
            expiresAt,
          },
        }
      );

      return true;
    } catch (error) {
      console.error("[Instagram] refreshToken error:", error);
      return false;
    }
  }

  private async publishImage(
    igUserId: string,
    accessToken: string,
    imageUrl: string,
    caption?: string
  ): Promise<PublishResult> {
    const createParams: Record<string, string> = {
      image_url: imageUrl,
      access_token: accessToken,
    };
    if (caption) createParams.caption = caption;

    const createResponse = await fetch(
      `${GRAPH_API_BASE}/${igUserId}/media`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(createParams),
      }
    );

    if (!createResponse.ok) {
      const errorBody = await createResponse.json();
      console.error("[Instagram] Media container creation failed:", createResponse.status, errorBody);
      const fbError = errorBody?.error;
      return {
        success: false,
        platform: "instagram",
        error: `Instagram media creation failed: ${fbError?.message || JSON.stringify(errorBody)}`,
      };
    }

    const createData = await createResponse.json();
    const containerId = createData.id as string;

    const processed = await this.waitForContainer(igUserId, accessToken, containerId);
    if (!processed) {
      return {
        success: false,
        platform: "instagram",
        error: "Instagram media container failed to process.",
      };
    }

    const publishResponse = await fetch(
      `${GRAPH_API_BASE}/${igUserId}/media_publish`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          creation_id: containerId,
          access_token: accessToken,
        }),
      }
    );

    if (!publishResponse.ok) {
      const errorBody = await publishResponse.json();
      console.error("[Instagram] Publish failed:", publishResponse.status, errorBody);
      const fbError = errorBody?.error;
      return {
        success: false,
        platform: "instagram",
        error: `Instagram publish failed: ${fbError?.message || JSON.stringify(errorBody)}`,
      };
    }

    const publishData = await publishResponse.json();
    const mediaId = publishData.id as string;

    return {
      success: true,
      platform: "instagram",
      platformPostId: mediaId,
      platformUrl: `https://www.instagram.com/p/${mediaId}`,
      publishedAt: new Date(),
    };
  }

  private async waitForContainer(
    igUserId: string,
    accessToken: string,
    containerId: string,
    maxAttempts: number = 10,
    delayMs: number = 2000
  ): Promise<boolean> {
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));

      const response = await fetch(
        `${GRAPH_API_BASE}/${containerId}?fields=status_code&access_token=${accessToken}`
      );

      if (!response.ok) continue;

      const data = await response.json();
      if (data.status_code === "FINISHED") return true;
      if (data.status_code === "ERROR") {
        console.error("[Instagram] Container processing error:", data);
        return false;
      }
    }

    console.error("[Instagram] Container processing timed out");
    return false;
  }
}

async function createTextImage(
  text: string,
  options?: { width?: number; height?: number }
): Promise<string | null> {
  try {
    const width = options?.width || 1080;
    const height = options?.height || 1080;

    // Generate SVG as text image (no canvas dependency needed)
    const truncated = text.length > 200 ? text.substring(0, 197) + "..." : text;
    const fontSize = Math.min(48, Math.floor(width / (truncated.length / 3)));
    const lines = truncated.split(/(?<=.{1,30})\s+/);
    const lineHeight = fontSize * 1.5;
    const startY = (height - lines.length * lineHeight) / 2;

    const textElements = lines
      .map(
        (line, i) =>
          `<text x="50%" y="${startY + i * lineHeight}" text-anchor="middle" dominant-baseline="middle" fill="white" font-size="${fontSize}" font-family="system-ui, sans-serif">${line.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</text>`
      )
      .join("\n    ");

    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
    <rect width="100%" height="100%" fill="#1a1a2e"/>
    <g padding="40">${textElements}</g>
  </svg>`;

    // Convert SVG to data URI
    const dataUri = `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
    return dataUri;
  } catch (error) {
    console.error("[Instagram] createTextImage error:", error);
    return null;
  }
}
