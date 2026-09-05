import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import crypto from "crypto";

const GRAPH_API_VERSION = "v19.0";

export async function GET() {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json(
        { success: false, error: "UNAUTHORIZED", message: "Your session has expired. Please sign in again." },
        { status: 401 }
      );
    }

    const clientId = process.env.INSTAGRAM_APP_ID || process.env.FACEBOOK_CLIENT_ID;
    const redirectUri = process.env.INSTAGRAM_REDIRECT_URI;
    if (!clientId || !redirectUri) {
      return NextResponse.json(
        { success: false, error: "Instagram OAuth not configured" },
        { status: 500 }
      );
    }

    const statePayload = JSON.stringify({ userId: user.userId, timestamp: Date.now() });
    const stateSignature = crypto
      .createHmac("sha256", process.env.NEXTAUTH_SECRET || "fallback-secret")
      .update(statePayload)
      .digest("hex");
    const state = Buffer.from(JSON.stringify({ payload: statePayload, signature: stateSignature })).toString("base64");

    const scopes = "instagram_basic,instagram_content_publish,pages_show_list,pages_read_engagement";
    const authUrl = new URL(`https://www.facebook.com/${GRAPH_API_VERSION}/dialog/oauth`);
    authUrl.searchParams.set("client_id", clientId);
    authUrl.searchParams.set("redirect_uri", redirectUri);
    authUrl.searchParams.set("scope", scopes);
    authUrl.searchParams.set("response_type", "code");
    authUrl.searchParams.set("state", state);

    return NextResponse.json({ success: true, data: { authUrl: authUrl.toString() } });
  } catch (error) {
    console.error("Instagram OAuth connect error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
