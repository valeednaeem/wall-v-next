import { connectToDatabase } from "@/lib/mongodb";
import GoogleOAuthToken from "@/models/google-oauth";

export interface GoogleTokenData {
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
  scope: string[];
}

export async function getValidGoogleToken(userId: string): Promise<GoogleTokenData | null> {
  await connectToDatabase();
  const tokenDoc = await GoogleOAuthToken.findOne({ userId }).sort({ updatedAt: -1 });
  if (!tokenDoc) return null;

  // Check if token is expired or about to expire (5 min buffer)
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
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret || !tokenDoc.refreshToken) {
    return null;
  }

  try {
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: tokenDoc.refreshToken,
        grant_type: "refresh_token",
      }),
    });

    const tokenData = await tokenResponse.json();

    if (!tokenResponse.ok) {
      console.error("Token refresh failed:", tokenData);
      return null;
    }

    const newExpiresAt = new Date(Date.now() + (tokenData.expires_in || 3600) * 1000);

    // Update stored token
    await GoogleOAuthToken.findByIdAndUpdate(tokenDoc._id, {
      accessToken: tokenData.access_token,
      expiresAt: newExpiresAt,
      scope: tokenData.scope?.split(" ") || tokenDoc.scope,
    });

    return {
      accessToken: tokenData.access_token,
      refreshToken: tokenDoc.refreshToken,
      expiresAt: newExpiresAt,
      scope: tokenData.scope?.split(" ") || tokenDoc.scope,
    };
  } catch (error) {
    console.error("Token refresh error:", error);
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