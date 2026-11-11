import mongoose from "mongoose";
import { connectToDatabase } from "@/lib/mongodb";
import GoogleOAuthToken from "@/models/google-oauth";
import User from "@/models/user";

export interface GoogleTokenData {
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
  scope: string[];
}

const NextAuthAccount = mongoose.models.Account || mongoose.model("Account", new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  type: String,
  provider: String,
  providerAccountId: String,
  refresh_token: String,
  access_token: String,
  expires_at: Number,
  token_type: String,
  scope: String,
  id_token: String,
  session_state: String,
}, { timestamps: true }));

export async function getValidGoogleToken(userId: string): Promise<GoogleTokenData | null> {
  await connectToDatabase();

  // 1. Check GoogleOAuthToken collection first
  const tokenDoc = await GoogleOAuthToken.findOne({ userId }).sort({ updatedAt: -1 });
  if (tokenDoc) {
    const now = new Date();
    const buffer = 5 * 60 * 1000;
    if (tokenDoc.expiresAt.getTime() - now.getTime() > buffer) {
      return {
        accessToken: tokenDoc.accessToken,
        refreshToken: tokenDoc.refreshToken,
        expiresAt: tokenDoc.expiresAt,
        scope: tokenDoc.scope,
      };
    }
    // Token expired, try to refresh
    const refreshed = await refreshToken(tokenDoc.refreshToken, tokenDoc._id.toString(), tokenDoc.scope);
    if (refreshed) return refreshed;
  }

  // 2. Fallback: check NextAuth accounts collection
  const user = await User.findById(userId).select("email").lean();
  if (!user?.email) return null;

  const nextAuthAccount = await NextAuthAccount.findOne({
    provider: "google",
    userId: userId,
  }).sort({ updatedAt: -1 }).lean() as Record<string, unknown> | null;

  if (!nextAuthAccount?.access_token) return null;

  const expiresAt = (nextAuthAccount.expires_at as number)
    ? new Date((nextAuthAccount.expires_at as number) * 1000)
    : new Date(Date.now() + 3600 * 1000);

  const now = new Date();
  const buffer = 5 * 60 * 1000;

  if (expiresAt.getTime() - now.getTime() > buffer && nextAuthAccount.refresh_token) {
    return {
      accessToken: nextAuthAccount.access_token as string,
      refreshToken: nextAuthAccount.refresh_token as string,
      expiresAt,
      scope: (nextAuthAccount.scope as string)?.split(" ") || [],
    };
  }

  // Token expired, try refresh
  if (nextAuthAccount.refresh_token) {
    const refreshed = await refreshToken(nextAuthAccount.refresh_token as string, undefined, (nextAuthAccount.scope as string)?.split(" ") || []);
    if (refreshed) return refreshed;
  }

  return null;
}

async function refreshToken(refreshToken: string, tokenId?: string, existingScope?: string[]): Promise<GoogleTokenData | null> {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret || !refreshToken) return null;

  try {
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
        grant_type: "refresh_token",
      }),
    });

    const tokenData = await tokenResponse.json();
    if (!tokenResponse.ok) return null;

    const newExpiresAt = new Date(Date.now() + (tokenData.expires_in || 3600) * 1000);

    if (tokenId) {
      await GoogleOAuthToken.findByIdAndUpdate(tokenId, {
        accessToken: tokenData.access_token,
        expiresAt: newExpiresAt,
        scope: tokenData.scope?.split(" ") || existingScope,
      });
    }

    return {
      accessToken: tokenData.access_token,
      refreshToken,
      expiresAt: newExpiresAt,
      scope: tokenData.scope?.split(" ") || existingScope || [],
    };
  } catch {
    return null;
  }
}

export async function hasGoogleScope(userId: string, requiredScope: string): Promise<boolean> {
  const tokenData = await getValidGoogleToken(userId);
  if (!tokenData) return false;
  return tokenData.scope.some((s) => s.includes(requiredScope));
}

export const GOOGLE_SCOPES = {
  ANALYTICS_READ: "https://www.googleapis.com/auth/analytics.readonly",
  ANALYTICS_EDIT: "https://www.googleapis.com/auth/analytics.edit",
  SEARCH_CONSOLE_READ: "https://www.googleapis.com/auth/webmasters.readonly",
  SEARCH_CONSOLE_WRITE: "https://www.googleapis.com/auth/webmasters",
  BUSINESS_PROFILE: "https://www.googleapis.com/auth/business.manage",
  MERCHANT_CENTER: "https://www.googleapis.com/auth/content",
  ADS: "https://www.googleapis.com/auth/adwords",
} as const;
