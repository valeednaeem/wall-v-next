import { NextResponse } from "next/server";

// Returns the list of OAuth providers that are actually configured via env vars.
// The login page uses this to decide which social login buttons to render.
export async function GET() {
  const providers: Record<string, { id: string; name: string }> = {};

  if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    providers.google = { id: "google", name: "Google" };
  }
  if (process.env.FACEBOOK_CLIENT_ID && process.env.FACEBOOK_CLIENT_SECRET) {
    providers.facebook = { id: "facebook", name: "Facebook" };
  }
  if (process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET) {
    providers.github = { id: "github", name: "GitHub" };
  }
  if (process.env.LINKEDIN_CLIENT_ID && process.env.LINKEDIN_CLIENT_SECRET) {
    providers.linkedin = { id: "linkedin", name: "LinkedIn" };
  }

  return NextResponse.json(providers);
}
