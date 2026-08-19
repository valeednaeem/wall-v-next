import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectToDatabase } from "@/lib/mongodb";
import GoogleServiceConfig from "@/models/google-services";
import { getValidGoogleToken, GOOGLE_SCOPES } from "@/lib/google-auth";
import { requirePermission } from "@/lib/api-middleware";

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ success: false, error: "UNAUTHORIZED", message: "Your session has expired. Please sign in again." }, { status: 401 });
    }

    // Convert NextAuth user to JWTPayload for permission check
    const jwtUser = {
      userId: session.user.id,
      email: session.user.email || null,
      role: (session.user as { role?: string }).role || "customer",
      permissions: (session.user as { permissions?: string[] }).permissions || [],
    };

    const permError = await requirePermission(jwtUser, "google:search_console:manage");
    if (permError) return permError;

    const body = await request.json();
    const { sitemapUrl } = body;

    if (!sitemapUrl) {
      return NextResponse.json({ success: false, error: "Sitemap URL is required" }, { status: 400 });
    }

    await connectToDatabase();

    // Get valid OAuth token
    const tokenData = await getValidGoogleToken(session.user.id);
    if (!tokenData) {
      return NextResponse.json({ success: false, error: "Google authorization required. Please connect your Google account first." }, { status: 401 });
    }

    const hasScope = tokenData.scope.some((s) => s.includes("webmasters"));
    if (!hasScope) {
      return NextResponse.json({ success: false, error: "Missing Search Console scope. Please reconnect your Google account." }, { status: 403 });
    }

    // Get Search Console config
    const serviceConfig = await GoogleServiceConfig.findOne({ serviceId: "search_console" });
    if (!serviceConfig || !serviceConfig.config.propertyUrl) {
      return NextResponse.json({ success: false, error: "Search Console not configured. Please enter your property URL first." }, { status: 400 });
    }

    // Extract site URL from property URL
    const propertyUrl = serviceConfig.config.propertyUrl;
    let siteUrl: string;

    try {
      const url = new URL(propertyUrl);
      siteUrl = `${url.protocol}//${url.host}`;
    } catch {
      return NextResponse.json({ success: false, error: "Invalid property URL format" }, { status: 400 });
    }

    // Submit sitemap to Search Console
    const encodedSiteUrl = encodeURIComponent(siteUrl);
    const encodedSitemapUrl = encodeURIComponent(sitemapUrl);

    const response = await fetch(
      `https://www.googleapis.com/webmasters/v3/sites/${encodedSiteUrl}/sitemaps?sitemapUrl=${encodedSitemapUrl}`,
      {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${tokenData.accessToken}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (response.ok) {
      // Update service config
      await GoogleServiceConfig.findByIdAndUpdate(serviceConfig._id, {
        lastSynced: new Date(),
        status: "sync_completed",
      });

      return NextResponse.json({ success: true, message: "Sitemap submitted successfully" });
    } else {
      const errorData = await response.json();
      console.error("Sitemap submission failed:", errorData);

      await GoogleServiceConfig.findByIdAndUpdate(serviceConfig._id, {
        status: "sync_failed",
        lastError: errorData.error?.message || `HTTP ${response.status}`,
      });

      return NextResponse.json(
        { success: false, error: errorData.error?.message || "Failed to submit sitemap" },
        { status: response.status }
      );
    }
  } catch (error) {
    console.error("Sitemap submission error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}