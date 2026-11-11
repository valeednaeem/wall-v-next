import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import crypto from "crypto";

const X_CLIENT_ID = process.env.X_CLIENT_ID || "";
const X_REDIRECT_URI = process.env.X_REDIRECT_URI || "";

function generateCodeVerifier(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  let binary = "";
  for (const byte of array) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function generateCodeChallenge(verifier: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(verifier);
  const digest = await crypto.subtle.digest("SHA-256", data);
  let binary = "";
  for (const byte of new Uint8Array(digest)) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export async function GET() {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json(
        { success: false, error: "UNAUTHORIZED", message: "Your session has expired. Please sign in again." },
        { status: 401 }
      );
    }

    if (!X_CLIENT_ID || !X_REDIRECT_URI) {
      return NextResponse.json(
        { success: false, error: "X/Twitter OAuth not configured" },
        { status: 500 }
      );
    }

    const statePayload = JSON.stringify({ userId: user.userId, timestamp: Date.now() });
    const stateSignature = crypto
      .createHmac("sha256", process.env.NEXTAUTH_SECRET || "fallback-secret")
      .update(statePayload)
      .digest("hex");
    const state = Buffer.from(JSON.stringify({ payload: statePayload, signature: stateSignature })).toString("base64");

    const codeVerifier = generateCodeVerifier();
    const codeChallenge = await generateCodeChallenge(codeVerifier);

    const authUrl = new URL("https://twitter.com/i/oauth2/authorize");
    authUrl.searchParams.set("response_type", "code");
    authUrl.searchParams.set("client_id", X_CLIENT_ID);
    authUrl.searchParams.set("redirect_uri", X_REDIRECT_URI);
    authUrl.searchParams.set("scope", "tweet.read tweet.write users.read offline.access");
    authUrl.searchParams.set("state", state);
    authUrl.searchParams.set("code_challenge", codeChallenge);
    authUrl.searchParams.set("code_challenge_method", "S256");

    const response = NextResponse.json({ success: true, data: { authUrl: authUrl.toString() } });
    response.cookies.set("x_pkce_verifier", codeVerifier, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 600,
      path: "/",
    });

    return response;
  } catch (error) {
    console.error("X/Twitter OAuth connect error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
