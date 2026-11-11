import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import SocialAccount from "@/models/socialAccount";
import User from "@/models/user";
import crypto from "crypto";

const BASE_URL = process.env.NEXTAUTH_URL || "http://localhost:3000";

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

    const clientId = process.env.FACEBOOK_CLIENT_ID;
    const clientSecret = process.env.FACEBOOK_CLIENT_SECRET;
    const redirectUri = process.env.FACEBOOK_REDIRECT_URI;
    if (!clientId || !clientSecret || !redirectUri) {
      return NextResponse.redirect(`${BASE_URL}/dashboard/content/connections?error=oauth_not_configured`);
    }

    const tokenUrl = new URL("https://graph.facebook.com/v19.0/oauth/access_token");
    tokenUrl.searchParams.set("client_id", clientId);
    tokenUrl.searchParams.set("client_secret", clientSecret);
    tokenUrl.searchParams.set("redirect_uri", redirectUri);
    tokenUrl.searchParams.set("code", code);

    const tokenResponse = await fetch(tokenUrl.toString());
    const tokenData = await tokenResponse.json();
    if (!tokenResponse.ok) {
      console.error("[Facebook] Token exchange failed:", tokenData);
      return NextResponse.redirect(`${BASE_URL}/dashboard/content/connections?error=token_exchange_failed`);
    }

    const userResponse = await fetch(
      `https://graph.facebook.com/v19.0/me?fields=id,name,email&access_token=${tokenData.access_token}`
    );
    const userData = await userResponse.json();

    const pagesResponse = await fetch(
      `https://graph.facebook.com/v19.0/me/accounts?fields=id,name&access_token=${tokenData.access_token}`
    );
    const pagesData = await pagesResponse.json();
    const pageId = pagesData?.data?.[0]?.id || "";

    const longLivedExpiry = tokenData.expires_in || 60 * 24 * 60 * 60;
    const expiresAt = new Date(Date.now() + longLivedExpiry * 1000);

    await SocialAccount.findOneAndUpdate(
      { user: userId, provider: "facebook" },
      {
        user: userId,
        provider: "facebook",
        providerId: userData.id || "",
        name: userData.name || "",
        email: userData.email || "",
        accessToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token || undefined,
        expiresAt,
      },
      { upsert: true, new: true }
    );

    return NextResponse.redirect(`${BASE_URL}/dashboard/content/connections?success=facebook`);
  } catch (error) {
    console.error("[Facebook] OAuth callback error:", error);
    return NextResponse.redirect(`${BASE_URL}/dashboard/content/connections?error=callback_failed`);
  }
}
