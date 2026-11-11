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

    const clientId = process.env.LINKEDIN_CLIENT_ID;
    const redirectUri = process.env.LINKEDIN_REDIRECT_URI;
    if (!clientId || !redirectUri) {
      return NextResponse.json(
        { success: false, error: "LinkedIn OAuth not configured" },
        { status: 500 }
      );
    }

    const statePayload = JSON.stringify({ userId: user.userId, timestamp: Date.now() });
    const stateSignature = crypto
      .createHmac("sha256", process.env.NEXTAUTH_SECRET || "fallback-secret")
      .update(statePayload)
      .digest("hex");
    const state = Buffer.from(JSON.stringify({ payload: statePayload, signature: stateSignature })).toString("base64");

    const scopes = ["w_member_social", "r_liteprofile", "r_emailaddress"];
    const authUrl = new URL("https://www.linkedin.com/oauth/v2/authorization");
    authUrl.searchParams.set("response_type", "code");
    authUrl.searchParams.set("client_id", clientId);
    authUrl.searchParams.set("redirect_uri", redirectUri);
    authUrl.searchParams.set("scope", scopes.join(" "));
    authUrl.searchParams.set("state", state);

    return NextResponse.json({ success: true, data: { authUrl: authUrl.toString() } });
  } catch (error) {
    console.error("LinkedIn OAuth connect error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
