import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { handleApiError } from "@/lib/api-middleware";
import { connectToDatabase } from "@/lib/mongodb";
import SocialAccount from "@/models/socialAccount";
import { getConnectionStatus } from "@/lib/social-adapters";

const SUPPORTED_PLATFORMS = ["linkedin", "facebook", "x", "instagram", "tiktok", "youtube"] as const;

export async function GET() {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectToDatabase();

    const status = await getConnectionStatus();

    const accounts = await SocialAccount.find({
      provider: { $in: ["linkedin", "facebook"] },
    })
      .select("provider providerId email name expiresAt updatedAt")
      .lean();

    const accountMap = new Map<string, typeof accounts[0]>();
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
        accountInfo?: {
          email?: string;
          name?: string;
          expiresAt?: Date;
          lastSynced?: Date;
        };
      }
    > = {};

    for (const platform of SUPPORTED_PLATFORMS) {
      const base = status[platform] || { connected: false };
      const account = accountMap.get(platform);

      enriched[platform] = {
        ...base,
        ...(account
          ? {
              accountInfo: {
                email: account.email,
                name: account.name,
                expiresAt: account.expiresAt,
                lastSynced: account.updatedAt,
              },
            }
          : {}),
      };
    }

    return NextResponse.json({ success: true, connections: enriched });
  } catch (error) {
    return handleApiError(error, "Connection status");
  }
}
