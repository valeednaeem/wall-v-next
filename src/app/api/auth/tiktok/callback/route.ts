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

    const clientKey = process.env.TIKTOK_CLIENT_KEY;
    const clientSecret = process.env.TIKTOK_CLIENT_SECRET;
    const redirectUri = process.env.TIKTOK_REDIRECT_URI;
    if (!clientKey || !clientSecret || !redirectUri) {
      return NextResponse.redirect(`${BASE_URL}/dashboard/content/connections?error=oauth_not_configured`);
    }

    const tokenResponse = await fetch("https://open.tiktokapis.com/oauth/token/", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_key: clientKey,
        client_secret: clientSecret,
        code,
        grant_type: "authorization_code",
        redirect_uri: redirectUri,
      }),
    });

    const tokenData = await tokenResponse.json();
    if (!tokenResponse.ok) {
      console.error("[TikTok] Token exchange failed:", tokenData);
      return NextResponse.redirect(`${BASE_URL}/dashboard/content/connections?error=token_exchange_failed`);
    }

    const userResponse = await fetch("https://open.tiktokapis.com/v2/user/info/?fields=display_name,open_id", {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    const userData = await userResponse.json();
    const tiktokUser = userData?.data?.user;

    const expiresAt = new Date(Date.now() + (tokenData.expires_in || 86400) * 1000);

    await SocialAccount.findOneAndUpdate(
      { user: userId, provider: "tiktok" },
      {
        user: userId,
        provider: "tiktok",
        providerId: tiktokUser?.open_id || "",
        name: tiktokUser?.display_name || "",
        accessToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token || undefined,
        expiresAt,
      },
      { upsert: true, new: true }
    );

    return NextResponse.redirect(`${BASE_URL}/dashboard/content/connections?success=tiktok`);
  } catch (error) {
    console.error("[TikTok] OAuth callback error:", error);
    return NextResponse.redirect(`${BASE_URL}/dashboard/content/connections?error=callback_failed`);
  }
}
