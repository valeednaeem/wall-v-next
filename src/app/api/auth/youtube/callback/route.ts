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

    const clientId = process.env.YOUTUBE_CLIENT_ID;
    const clientSecret = process.env.YOUTUBE_CLIENT_SECRET;
    const redirectUri = process.env.YOUTUBE_REDIRECT_URI;
    if (!clientId || !clientSecret || !redirectUri) {
      return NextResponse.redirect(`${BASE_URL}/dashboard/content/connections?error=oauth_not_configured`);
    }

    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
    });

    const tokenData = await tokenResponse.json();
    if (!tokenResponse.ok) {
      console.error("[YouTube] Token exchange failed:", tokenData);
      return NextResponse.redirect(`${BASE_URL}/dashboard/content/connections?error=token_exchange_failed`);
    }

    const channelResponse = await fetch(
      "https://www.googleapis.com/youtube/v3/channels?part=snippet&mine=true",
      { headers: { Authorization: `Bearer ${tokenData.access_token}` } }
    );
    const channelData = await channelResponse.json();
    const channel = channelData?.items?.[0];

    if (!channel) {
      return NextResponse.redirect(`${BASE_URL}/dashboard/content/connections?error=no_youtube_channel`);
    }

    const expiresAt = new Date(Date.now() + (tokenData.expires_in || 3600) * 1000);

    await SocialAccount.findOneAndUpdate(
      { user: userId, provider: "youtube" },
      {
        user: userId,
        provider: "youtube",
        providerId: channel.id || "",
        name: channel.snippet?.title || "",
        avatar: channel.snippet?.thumbnails?.default?.url || "",
        accessToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token || undefined,
        expiresAt,
      },
      { upsert: true, new: true }
    );

    return NextResponse.redirect(`${BASE_URL}/dashboard/content/connections?success=youtube`);
  } catch (error) {
    console.error("[YouTube] OAuth callback error:", error);
    return NextResponse.redirect(`${BASE_URL}/dashboard/content/connections?error=callback_failed`);
  }
}
