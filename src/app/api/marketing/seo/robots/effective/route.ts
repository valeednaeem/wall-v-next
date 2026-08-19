import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectToDatabase } from "@/lib/mongodb";
import RobotsSettings from "@/models/robots-settings";
import SiteSettings from "@/models/site-settings";
import { requirePermission } from "@/lib/api-middleware";

const SYSTEM_PROTECTED_DISALLOW = [
  "/dashboard",
  "/api",
  "/portal",
  "/customer",
  "/admin",
  "/orders",
  "/projects",
  "/private",
  "/preview",
  "/login",
  "/register",
  "/password-reset",
];

export async function GET() {
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

    const permError = await requirePermission(jwtUser, "seo:view");
    if (permError) return permError;

    await connectToDatabase();

    // Get robots settings
    let settings = await RobotsSettings.findOne().lean();
    if (!settings) {
      settings = {
        defaultDirectives: [{ userAgent: "*", allow: ["/"], disallow: SYSTEM_PROTECTED_DISALLOW }],
        additionalAllowed: [],
        additionalBlocked: [],
        sitemapUrl: "",
        hostDirective: "",
        crawlDelay: undefined,
      };
    }

    // Get site URL for sitemap
    const siteSettings = await SiteSettings.find({ key: { $in: ["seo.canonicalDomain", "general.siteUrl"] } }).lean();
    const canonicalDomain = siteSettings.find((s) => s.key === "seo.canonicalDomain")?.value as string;
    const siteUrl = canonicalDomain || siteSettings.find((s) => s.key === "general.siteUrl")?.value as string || process.env.NEXT_PUBLIC_APP_URL || "https://wall-v.com";

    // Build robots.txt
    let robotsTxt = "";

    // Default directives
    for (const directive of settings.defaultDirectives || [{ userAgent: "*", allow: ["/"], disallow: SYSTEM_PROTECTED_DISALLOW }]) {
      robotsTxt += `User-agent: ${directive.userAgent || "*"}\n`;

      // Allow
      const allowPaths = [...(directive.allow || [])];
      if (allowPaths.length === 0) allowPaths.push("/");
      for (const path of allowPaths) {
        robotsTxt += `Allow: ${path}\n`;
      }

      // Disallow (always include system-protected)
      const disallowPaths = [...new Set([...(directive.disallow || []), ...SYSTEM_PROTECTED_DISALLOW])];
      for (const path of disallowPaths) {
        robotsTxt += `Disallow: ${path}\n`;
      }

      robotsTxt += "\n";
    }

    // Additional allowed
    for (const path of settings.additionalAllowed || []) {
      if (path) {
        robotsTxt += `Allow: ${path}\n`;
      }
    }

    // Additional blocked
    for (const path of settings.additionalBlocked || []) {
      if (path) {
        robotsTxt += `Disallow: ${path}\n`;
      }
    }

    if (settings.additionalAllowed?.length || settings.additionalBlocked?.length) {
      robotsTxt += "\n";
    }

    // Host directive
    if (settings.hostDirective) {
      robotsTxt += `Host: ${settings.hostDirective}\n`;
    }

    // Crawl delay
    if (settings.crawlDelay) {
      robotsTxt += `Crawl-delay: ${settings.crawlDelay}\n`;
    }

    if (settings.hostDirective || settings.crawlDelay) {
      robotsTxt += "\n";
    }

    // Sitemap
    const sitemapUrl = settings.sitemapUrl || `${siteUrl}/sitemap.xml`;
    robotsTxt += `Sitemap: ${sitemapUrl}\n`;

    return NextResponse.json({ success: true, data: robotsTxt.trim() });
  } catch (error) {
    console.error("Effective robots.txt error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}