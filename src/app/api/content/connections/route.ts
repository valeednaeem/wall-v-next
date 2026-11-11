import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { handleApiError } from "@/lib/api-middleware";
import { connectToDatabase } from "@/lib/mongodb";
import SocialAccount from "@/models/socialAccount";

const SUPPORTED_PLATFORMS = ["linkedin", "facebook", "x", "instagram", "tiktok", "youtube"] as const;

const ENV_CHECKS: Record<string, { envVars: string[]; label: string }> = {
  linkedin: { envVars: ["LINKEDIN_CLIENT_ID", "LINKEDIN_CLIENT_SECRET"], label: "LinkedIn API" },
  facebook: { envVars: ["FACEBOOK_CLIENT_ID", "FACEBOOK_CLIENT_SECRET"], label: "Facebook API" },
  x: { envVars: ["X_CLIENT_ID", "X_CLIENT_SECRET"], label: "X/Twitter API" },
  instagram: { envVars: ["INSTAGRAM_APP_ID", "INSTAGRAM_APP_SECRET"], label: "Instagram API" },
  tiktok: { envVars: ["TIKTOK_CLIENT_KEY", "TIKTOK_CLIENT_SECRET"], label: "TikTok API" },
  youtube: { envVars: ["YOUTUBE_CLIENT_ID", "YOUTUBE_CLIENT_SECRET"], label: "YouTube API" },
};

export async function GET() {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectToDatabase();

    const accounts = await SocialAccount.find({
      provider: { $in: [...SUPPORTED_PLATFORMS] },
    })
      .select("+accessToken +refreshToken")
      .select("provider providerId email name expiresAt updatedAt accessToken")
      .lean();

    const accountMap = new Map<string, (typeof accounts)[0]>();
    for (const account of accounts) {
      if (!accountMap.has(account.provider)) {
        accountMap.set(account.provider, account);
      }
    }

    const enriched: Record<
      string,
      {
        connected: boolean;
        lastPublish?: Date;
        error?: string;
        envConfigured?: boolean;
        tokenValid?: boolean;
        accountInfo?: {
          email?: string;
          name?: string;
          expiresAt?: Date;
          lastSynced?: Date;
        };
      }
    > = {};

    for (const platform of SUPPORTED_PLATFORMS) {
      const account = accountMap.get(platform);
      const envCheck = ENV_CHECKS[platform];
      const envConfigured = envCheck?.envVars.every(
        (v) => !!process.env[v]
      ) ?? false;

      if (!account || !account.accessToken) {
        enriched[platform] = {
          connected: false,
          envConfigured,
          tokenValid: false,
          error: envConfigured
            ? undefined
            : `${envCheck?.label} credentials not configured.`,
        };
        continue;
      }

      const tokenExpired =
        !!account.expiresAt && new Date(account.expiresAt) < new Date();
      const tokenExpiringSoon =
        !!account.expiresAt &&
        new Date(account.expiresAt) < new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

      const platformErrors: string[] = [];
      if (tokenExpired) platformErrors.push("Access token expired.");
      else if (tokenExpiringSoon) platformErrors.push("Access token expiring soon.");
      if (!envConfigured) platformErrors.push(`${envCheck?.label} credentials not configured.`);

      enriched[platform] = {
        connected: !tokenExpired,
        envConfigured,
        tokenValid: !tokenExpired && !tokenExpiringSoon,
        error: platformErrors.length > 0 ? platformErrors.join(" ") : undefined,
        accountInfo: {
          email: account.email,
          name: account.name,
          expiresAt: account.expiresAt,
          lastSynced: account.updatedAt,
        },
      };
    }

    return NextResponse.json({ success: true, connections: enriched });
  } catch (error) {
    return handleApiError(error, "Connection status");
  }
}
