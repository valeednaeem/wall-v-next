import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import GoogleOAuthToken from "@/models/google-oauth";
import { getFullUser } from "@/lib/auth";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");
    const error = url.searchParams.get("error");

    if (error) {
      return NextResponse.redirect(`${process.env.NEXTAUTH_URL}/dashboard/marketing/google?error=${error}`);
    }

    if (!code || !state) {
      return NextResponse.redirect(`${process.env.NEXTAUTH_URL}/dashboard/marketing/google?error=invalid_callback`);
    }

    let userId: string;
    try {
      const stateData = JSON.parse(Buffer.from(state, "base64").toString());
      userId = stateData.userId;
      if (Date.now() - stateData.timestamp > 10 * 60 * 1000) {
        return NextResponse.redirect(`${process.env.NEXTAUTH_URL}/dashboard/marketing/google?error=state_expired`);
      }
    } catch {
      return NextResponse.redirect(`${process.env.NEXTAUTH_URL}/dashboard/marketing/google?error=invalid_state`);
    }

    await connectToDatabase();
    const user = await getFullUser();
    if (!user || user._id.toString() !== userId) {
      return NextResponse.redirect(`${process.env.NEXTAUTH_URL}/dashboard/marketing/google?error=user_mismatch`);
    }

    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const redirectUri = `${process.env.NEXTAUTH_URL}/api/auth/google/callback`;

    if (!clientId || !clientSecret) {
      return NextResponse.redirect(`${process.env.NEXTAUTH_URL}/dashboard/marketing/google?error=oauth_not_configured`);
    }

    // Exchange code for tokens
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
      console.error("Token exchange failed:", tokenData);
      return NextResponse.redirect(`${process.env.NEXTAUTH_URL}/dashboard/marketing/google?error=token_exchange_failed`);
    }

    // Get user info to store email
    const userInfoResponse = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    const userInfo = await userInfoResponse.json();

    // Calculate expiry
    const expiresAt = new Date(Date.now() + (tokenData.expires_in || 3600) * 1000);

    // Store tokens securely
    await GoogleOAuthToken.findOneAndUpdate(
      { userId: user._id, email: userInfo.email },
      {
        userId: user._id,
        email: userInfo.email,
        accessToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token,
        expiresAt,
        scope: tokenData.scope?.split(" ") || [],
        tokenType: tokenData.token_type || "Bearer",
      },
      { upsert: true, new: true }
    );

    // Update Google service statuses to auth_required (ready for config)
    const { default: GoogleServiceConfig } = await import("@/models/google-services");
    await GoogleServiceConfig.updateMany(
      { enabled: true, status: "not_configured" },
      { $set: { status: "auth_required" } }
    );

    return NextResponse.redirect(`${process.env.NEXTAUTH_URL}/dashboard/marketing/google?connected=true`);
  } catch (error) {
    console.error("Google OAuth callback error:", error);
    return NextResponse.redirect(`${process.env.NEXTAUTH_URL}/dashboard/marketing/google?error=callback_failed`);
  }
}