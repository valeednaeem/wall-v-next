import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectToDatabase } from "@/lib/mongodb";
import { requirePermission } from "@/lib/api-middleware";

export async function POST() {
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

    const permError = await requirePermission(jwtUser, "seo:sitemap:manage");
    if (permError) return permError;

    await connectToDatabase();

    const siteUrl = process.env.NEXT_PUBLIC_APP_URL || "https://wall-v.com";
    const sitemapUrl = `${siteUrl}/sitemap.xml`;

    // Fetch the sitemap
    const response = await fetch(sitemapUrl);
    if (!response.ok) {
      return NextResponse.json({
        success: false,
        error: `Sitemap not accessible: HTTP ${response.status}`,
      });
    }

    const xml = await response.text();

    // Basic validation
    const issues: string[] = [];

    // Check XML declaration
    if (!xml.trim().startsWith("<?xml")) {
      issues.push("Missing XML declaration");
    }

    // Check urlset or sitemapindex
    if (!xml.includes("<urlset") && !xml.includes("<sitemapindex")) {
      issues.push("Missing urlset or sitemapindex root element");
    }

    // Check for URLs
    const urlCount = (xml.match(/<url>/g) || []).length;
    const sitemapCount = (xml.match(/<sitemap>/g) || []).length;

    if (urlCount === 0 && sitemapCount === 0) {
      issues.push("No URLs found in sitemap");
    }

    // Check for required elements in url entries
    if (urlCount > 0) {
      const locMatches = xml.match(/<loc>(.*?)<\/loc>/g) || [];
      if (locMatches.length !== urlCount) {
        issues.push("Some URL entries missing <loc> element");
      }

      // Check for valid URLs
      for (const loc of locMatches) {
        const url = loc.replace(/<\/?loc>/g, "");
        try {
          new URL(url);
        } catch {
          issues.push(`Invalid URL in sitemap: ${url}`);
        }
      }
    }

    // Check sitemap size (50MB limit, 50000 URLs)
    const sizeBytes = Buffer.byteLength(xml, "utf8");
    const sizeMB = sizeBytes / (1024 * 1024);
    if (sizeMB > 50) {
      issues.push(`Sitemap exceeds 50MB limit: ${sizeMB.toFixed(2)}MB`);
    }
    if (urlCount > 50000) {
      issues.push(`Sitemap exceeds 50,000 URL limit: ${urlCount} URLs`);
    }

    // Check for lastmod format
    const lastmodMatches = xml.match(/<lastmod>(.*?)<\/lastmod>/g) || [];
    for (const lastmod of lastmodMatches) {
      const dateStr = lastmod.replace(/<\/?lastmod>/g, "");
      if (!/^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}(Z|([+-]\d{2}:\d{2})))?$/.test(dateStr)) {
        issues.push(`Invalid lastmod format: ${dateStr} (should be YYYY-MM-DD or ISO 8601)`);
      }
    }

    return NextResponse.json({
      success: issues.length === 0,
      data: {
        message: issues.length === 0 ? "Sitemap is valid" : `Found ${issues.length} issue(s)`,
        urlCount,
        sitemapCount,
        sizeMB: sizeMB.toFixed(2),
        issues,
      },
    });
  } catch (error) {
    console.error("Sitemap validation error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}