import type { MetadataRoute } from "next";
import { connectToDatabase } from "@/lib/mongodb";
import RobotsSettings from "@/models/robots-settings";
import SiteSettings from "@/models/site-settings";

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

export default async function robots(): Promise<MetadataRoute.Robots> {
  try {
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

    // Build rules from settings
    const rules: MetadataRoute.Robots["rules"] = [];

    for (const directive of settings.defaultDirectives || [{ userAgent: "*", allow: ["/"], disallow: SYSTEM_PROTECTED_DISALLOW }]) {
      const allowPaths = [...(directive.allow || [])];
      if (allowPaths.length === 0) allowPaths.push("/");

      // Always include system-protected routes in disallow
      const disallowPaths = [...new Set([...(directive.disallow || []), ...SYSTEM_PROTECTED_DISALLOW])];

      rules.push({
        userAgent: directive.userAgent || "*",
        allow: allowPaths,
        disallow: disallowPaths,
      });
    }

    // Add additional allowed/blocked as separate rules for all user agents
    if (settings.additionalAllowed?.length || settings.additionalBlocked?.length) {
      rules.push({
        userAgent: "*",
        allow: settings.additionalAllowed || [],
        disallow: settings.additionalBlocked || [],
      });
    }

    // Sitemap
    const sitemapUrl = settings.sitemapUrl || `${siteUrl}/sitemap.xml`;

    return {
      rules,
      sitemap: sitemapUrl,
      host: settings.hostDirective,
      crawlDelay: settings.crawlDelay,
    };
  } catch (error) {
    console.error("Robots.txt generation error:", error);
    // Fallback to safe defaults
    return {
      rules: [
        {
          userAgent: "*",
          allow: "/",
          disallow: SYSTEM_PROTECTED_DISALLOW,
        },
      ],
      sitemap: `${process.env.NEXT_PUBLIC_APP_URL || "https://wall-v.com"}/sitemap.xml`,
    };
  }
}
