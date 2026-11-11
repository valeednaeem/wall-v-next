import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import SocialAccount from "@/models/socialAccount";
import User from "@/models/user";
import crypto from "crypto";

const BASE_URL = process.env.NEXTAUTH_URL || "http://localhost:3000";
const GRAPH_API_VERSION = "v19.0";
const GRAPH_API_BASE = `https://graph.facebook.com/${GRAPH_API_VERSION}`;

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");
    const error = url.searchParams.get("error");

    if (error) {
      return NextResponse.redirect(`${BASE_URL}/dashboard/content/connections?error=${error}`);
    }

    if (!code || !state) {
      return NextResponse.redirect(`${BASE_URL}/dashboard/content/connections?error=invalid_callback`);
    }

    let userId: string;
    try {
      const decoded = JSON.parse(Buffer.from(state, "base64").toString());
      const stateData = JSON.parse(decoded.payload);
      const expectedSig = crypto
        .createHmac("sha256", process.env.NEXTAUTH_SECRET || "fallback-secret")
        .update(decoded.payload)
        .digest("hex");
      if (decoded.signature !== expectedSig) {
        return NextResponse.redirect(`${BASE_URL}/dashboard/content/connections?error=invalid_signature`);
      }
      userId = stateData.userId;
      if (Date.now() - stateData.timestamp > 10 * 60 * 1000) {
        return NextResponse.redirect(`${BASE_URL}/dashboard/content/connections?error=state_expired`);
      }
    } catch {
      return NextResponse.redirect(`${BASE_URL}/dashboard/content/connections?error=invalid_state`);
    }

    await connectToDatabase();
    const user = await User.findById(userId).lean();
    if (!user) {
      return NextResponse.redirect(`${BASE_URL}/dashboard/content/connections?error=user_not_found`);
    }

    const clientId = process.env.INSTAGRAM_APP_ID || process.env.FACEBOOK_CLIENT_ID;
    const clientSecret = process.env.INSTAGRAM_APP_SECRET || process.env.FACEBOOK_CLIENT_SECRET;
    const redirectUri = process.env.INSTAGRAM_REDIRECT_URI;
    if (!clientId || !clientSecret || !redirectUri) {
      return NextResponse.redirect(`${BASE_URL}/dashboard/content/connections?error=oauth_not_configured`);
    }

    const tokenUrl = new URL(`${GRAPH_API_BASE}/oauth/access_token`);
    tokenUrl.searchParams.set("client_id", clientId);
    tokenUrl.searchParams.set("client_secret", clientSecret);
    tokenUrl.searchParams.set("redirect_uri", redirectUri);
    tokenUrl.searchParams.set("code", code);

    const tokenResponse = await fetch(tokenUrl.toString());
    const tokenData = await tokenResponse.json();
    if (!tokenResponse.ok) {
      console.error("[Instagram] Token exchange failed:", tokenData);
      return NextResponse.redirect(`${BASE_URL}/dashboard/content/connections?error=token_exchange_failed`);
    }

    const pagesResponse = await fetch(
      `${GRAPH_API_BASE}/me/accounts?fields=id,name,instagram_business_account&access_token=${tokenData.access_token}`
    );
    const pagesData = await pagesResponse.json();
    const page = pagesData?.data?.[0];
    const igBusinessAccount = page?.instagram_business_account;

    if (!igBusinessAccount?.id) {
      return NextResponse.redirect(`${BASE_URL}/dashboard/content/connections?error=no_instagram_business_account`);
    }

    const igProfileResponse = await fetch(
      `${GRAPH_API_BASE}/${igBusinessAccount.id}?fields=id,username,name&access_token=${tokenData.access_token}`
    );
    const igProfile = await igProfileResponse.json();

    const longLivedExpiry = tokenData.expires_in || 60 * 24 * 60 * 60;
    const expiresAt = new Date(Date.now() + longLivedExpiry * 1000);

    await SocialAccount.findOneAndUpdate(
      { user: userId, provider: "instagram" },
      {
        user: userId,
        provider: "instagram",
        providerId: igBusinessAccount.id,
        name: igProfile?.name || igProfile?.username || "",
        accessToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token || undefined,
        expiresAt,
      },
      { upsert: true, new: true }
    );

    return NextResponse.redirect(`${BASE_URL}/dashboard/content/connections?success=instagram`);
  } catch (error) {
    console.error("[Instagram] OAuth callback error:", error);
    return NextResponse.redirect(`${BASE_URL}/dashboard/content/connections?error=callback_failed`);
  }
}
