import { connectToDatabase } from "@/lib/mongodb";
import SocialAccount from "@/models/socialAccount";
import type { PlatformAdapter, PublishResult, SocialPost } from "./types";

const X_CLIENT_ID = process.env.X_CLIENT_ID || "";
const X_CLIENT_SECRET = process.env.X_CLIENT_SECRET || "";
const X_REDIRECT_URI = process.env.X_REDIRECT_URI || "";

const X_API_BASE = "https://api.twitter.com/2";
const X_OAUTH_BASE = "https://api.twitter.com/2/oauth2";
const TWEET_MAX_LENGTH = 280;

export class XAdapter implements PlatformAdapter {
  name = "x";

  async isConnected(): Promise<boolean> {
    try {
      await connectToDatabase();
      const account = await SocialAccount.findOne({ provider: "x" })
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
      console.error("[X] isConnected check failed:", error);
      return false;
    }
  }

  async publish(post: SocialPost): Promise<PublishResult> {
    try {
      await connectToDatabase();
      const account = await SocialAccount.findOne({ provider: "x" })
        .select("+accessToken +refreshToken")
        .lean();

      if (!account || !account.accessToken) {
        return {
          success: false,
          platform: "x",
          requiresAuth: true,
          error: "X/Twitter not connected. Connect via Settings > Social.",
        };
      }

      let accessToken = account.accessToken;

      if (account.expiresAt && new Date(account.expiresAt) < new Date()) {
        if (!account.refreshToken) {
          return {
            success: false,
            platform: "x",
            requiresAuth: true,
            error: "X/Twitter token expired. Reconnect via Settings > Social.",
          };
        }
        const refreshed = await this.refreshToken();
        if (!refreshed) {
          return {
            success: false,
            platform: "x",
            requiresAuth: true,
            error: "X/Twitter token refresh failed. Reconnect via Settings > Social.",
          };
        }
        const refreshedAccount = await SocialAccount.findOne({ provider: "x" })
          .select("+accessToken")
          .lean();
        if (!refreshedAccount?.accessToken) {
          return {
            success: false,
            platform: "x",
            requiresAuth: true,
            error: "X/Twitter token unavailable after refresh.",
          };
        }
        accessToken = refreshedAccount.accessToken;
      }

      const text = post.hashtags?.length
        ? `${post.content}\n\n${post.hashtags.map((h) => `#${h}`).join(" ")}`
        : post.content;

      const tweets = splitIntoThread(text, TWEET_MAX_LENGTH);

      if (tweets.length === 1) {
        return await this.createTweet(accessToken, tweets[0]);
      }

      return await this.createThread(accessToken, tweets);
    } catch (error) {
      console.error("[X] Publish failed:", error);
      return {
        success: false,
        platform: "x",
        error: `X/Twitter publish error: ${error instanceof Error ? error.message : "Unknown error"}`,
      };
    }
  }

  getAuthUrl(): string {
    if (!X_CLIENT_ID || !X_REDIRECT_URI) return "";

    const codeVerifier = generateCodeVerifier();
    const codeChallenge = base64UrlEncode(sha256(codeVerifier));

    const params = new URLSearchParams({
      response_type: "code",
      client_id: X_CLIENT_ID,
      redirect_uri: X_REDIRECT_URI,
      scope: "tweet.read tweet.write users.read offline.access",
      state: "wall-v-x-oauth",
      code_challenge: codeChallenge,
      code_challenge_method: "S256",
    });
    return `https://api.x.com/2/oauth2/authorize?${params.toString()}`;
  }

  async refreshToken(): Promise<boolean> {
    try {
      await connectToDatabase();
      const account = await SocialAccount.findOne({ provider: "x" })
        .select("+accessToken +refreshToken")
        .lean();

      if (!account?.refreshToken || !X_CLIENT_ID || !X_CLIENT_SECRET) return false;

      const response = await fetch(`${X_OAUTH_BASE}/token`, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Authorization: `Basic ${Buffer.from(`${X_CLIENT_ID}:${X_CLIENT_SECRET}`).toString("base64")}`,
        },
        body: new URLSearchParams({
          grant_type: "refresh_token",
          refresh_token: account.refreshToken,
        }),
      });

      if (!response.ok) {
        console.error("[X] Token refresh failed:", response.status);
        return false;
      }

      const data = await response.json();
      const expiresAt = new Date(Date.now() + data.expires_in * 1000);

      await SocialAccount.updateOne(
        { provider: "x" },
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
      console.error("[X] refreshToken error:", error);
      return false;
    }
  }

  private async createTweet(
    accessToken: string,
    text: string,
    replyToTweetId?: string
  ): Promise<PublishResult> {
    const body: Record<string, unknown> = { text };
    if (replyToTweetId) body.reply = { in_reply_to_tweet_id: replyToTweetId };

    const response = await fetch(`${X_API_BASE}/tweets`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorBody = await response.json();
      console.error("[X] API error:", response.status, errorBody);

      if (response.status === 429) {
        return {
          success: false,
          platform: "x",
          rateLimited: true,
          error: `X/Twitter rate limited. ${errorBody?.title || "Try again later."}`,
        };
      }

      if (response.status === 401 || response.status === 403) {
        return {
          success: false,
          platform: "x",
          requiresAuth: true,
          error: `X/Twitter authorization failed: ${errorBody?.title || "Invalid credentials."}`,
        };
      }

      return {
        success: false,
        platform: "x",
        error: `X/Twitter API error (${response.status}): ${errorBody?.detail || errorBody?.title || "Unknown error"}`,
      };
    }

    const data = await response.json();
    const tweetId = data?.data?.id as string | undefined;

    return {
      success: true,
      platform: "x",
      platformPostId: tweetId,
      platformUrl: tweetId ? `https://x.com/i/web/status/${tweetId}` : undefined,
      publishedAt: new Date(),
    };
  }

  private async createThread(
    accessToken: string,
    tweets: string[]
  ): Promise<PublishResult> {
    let lastTweetId: string | undefined;

    for (let i = 0; i < tweets.length; i++) {
      const numberedTweet =
        tweets.length > 1 ? `${i + 1}/${tweets.length} ${tweets[i]}` : tweets[i];

      const result = await this.createTweet(accessToken, numberedTweet, lastTweetId);

      if (!result.success) return result;
      lastTweetId = result.platformPostId;
    }

    return {
      success: true,
      platform: "x",
      platformPostId: lastTweetId,
      platformUrl: lastTweetId
        ? `https://x.com/i/web/status/${lastTweetId}`
        : undefined,
      publishedAt: new Date(),
    };
  }
}

function splitIntoThread(content: string, maxLength: number = 280): string[] {
  if (content.length <= maxLength) return [content];

  const chunks: string[] = [];
  let remaining = content;

  while (remaining.length > 0) {
    if (remaining.length <= maxLength) {
      chunks.push(remaining);
      break;
    }

    let breakPoint = remaining.lastIndexOf(". ", maxLength - 1);
    if (breakPoint <= 0) breakPoint = remaining.lastIndexOf("\n", maxLength - 1);
    if (breakPoint <= 0) breakPoint = remaining.lastIndexOf(" ", maxLength - 1);
    if (breakPoint <= 0) breakPoint = maxLength;

    const chunk = remaining.slice(0, breakPoint + 1).trim();
    chunks.push(chunk);
    remaining = remaining.slice(breakPoint + 1).trim();
  }

  return chunks;
}

function generateCodeVerifier(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return base64UrlEncode(array);
}

function sha256(plain: string): Uint8Array {
  const encoder = new TextEncoder();
  const data = encoder.encode(plain);
  return new Uint8Array(data);
}

function base64UrlEncode(data: Uint8Array | string): string {
  const bytes =
    typeof data === "string" ? new TextEncoder().encode(data) : data;
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
