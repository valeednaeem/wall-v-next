import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import crypto from "crypto";

export async function GET() {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json(
        { success: false, error: "UNAUTHORIZED", message: "Your session has expired. Please sign in again." },
        { status: 401 }
      );
    }

    const clientId = process.env.YOUTUBE_CLIENT_ID;
    const redirectUri = process.env.YOUTUBE_REDIRECT_URI;
    if (!clientId || !redirectUri) {
      return NextResponse.json(
        { success: false, error: "YouTube OAuth not configured" },
        { status: 500 }
      );
    }

    const statePayload = JSON.stringify({ userId: user.userId, timestamp: Date.now() });
    const stateSignature = crypto
      .createHmac("sha256", process.env.NEXTAUTH_SECRET || "fallback-secret")
      .update(statePayload)
      .digest("hex");
    const state = Buffer.from(JSON.stringify({ payload: statePayload, signature: stateSignature })).toString("base64");

    const scopes = [
      "https://www.googleapis.com/auth/youtube.upload",
      "https://www.googleapis.com/auth/youtube",
      "https://www.googleapis.com/auth/youtube.force-ssl",
    ];
    const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
    authUrl.searchParams.set("response_type", "code");
    authUrl.searchParams.set("client_id", clientId);
    authUrl.searchParams.set("redirect_uri", redirectUri);
    authUrl.searchParams.set("scope", scopes.join(" "));
    authUrl.searchParams.set("access_type", "offline");
    authUrl.searchParams.set("prompt", "consent");
    authUrl.searchParams.set("state", state);

    return NextResponse.json({ success: true, data: { authUrl: authUrl.toString() } });
  } catch (error) {
    console.error("YouTube OAuth connect error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
