import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectToDatabase } from "@/lib/mongodb";
import SiteSettings from "@/models/site-settings";
import BlogPost from "@/models/blog-post";
import Product from "@/models/product";
import LegalPage from "@/models/legal-page";
import { requirePermission } from "@/lib/api-middleware";
import SitemapSettings from "@/models/sitemap-settings";

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&")
    .replace(/</g, "<")
    .replace(/>/g, ">")
    .replace(/"/g, '"')
    .replace(/'/g, "&apos;");
}

function buildUrl(
  loc: string,
  lastmod?: string,
  changefreq?: "always" | "hourly" | "daily" | "weekly" | "monthly" | "yearly" | "never",
  priority?: number
): string {
  let url = `  <url>\n    <loc>${escapeXml(loc)}</loc>`;
  if (lastmod) url += `\n    <lastmod>${lastmod}</lastmod>`;
  if (changefreq) url += `\n    <changefreq>${changefreq}</changefreq>`;
  if (priority !== undefined) url += `\n    <priority>${priority.toFixed(1)}</priority>`;
  url += "\n  </url>";
  return url;
}

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

    const permError = await requirePermission(jwtUser, "seo:sitemap:manage");
    if (permError) return permError;

    await connectToDatabase();

    // Get site settings for base URL
    const siteSettings = await SiteSettings.find({ key: { $in: ["seo.canonicalDomain", "general.siteUrl"] } }).lean();
    const canonicalDomain = siteSettings.find((s) => s.key === "seo.canonicalDomain")?.value as string;
    const siteUrl = canonicalDomain || siteSettings.find((s) => s.key === "general.siteUrl")?.value as string || "https://wall-v.com";

    // Get sitemap settings
    let settings = await SitemapSettings.findOne().lean();
    if (!settings) {
      settings = {
        includePages: true,
        includeBlogPosts: true,
        includeProducts: true,
        includeLegalPages: true,
        includeCategoryPages: true,
        includeTagPages: true,
        defaultChangeFreq: "weekly",
        defaultPriority: 0.5,
        maxUrls: 50000,
      };
    }

    const urls: string[] = [];
    const baseUrl = siteUrl.replace(/\/$/, "");

    // Static pages
    if (settings.includePages) {
      const staticPages = [
        { url: baseUrl, changefreq: "daily", priority: 1.0 },
        { url: `${baseUrl}/services`, changefreq: "weekly", priority: 0.9 },
        { url: `${baseUrl}/hosting-domain`, changefreq: "weekly", priority: 0.9 },
        { url: `${baseUrl}/products`, changefreq: "daily", priority: 0.9 },
        { url: `${baseUrl}/blog`, changefreq: "daily", priority: 0.8 },
        { url: `${baseUrl}/contact`, changefreq: "monthly", priority: 0.7 },
        { url: `${baseUrl}/about`, changefreq: "monthly", priority: 0.7 },
        { url: `${baseUrl}/pricing`, changefreq: "weekly", priority: 0.8 },
        { url: `${baseUrl}/privacy`, changefreq: "yearly", priority: 0.3 },
        { url: `${baseUrl}/terms`, changefreq: "yearly", priority: 0.3 },
        { url: `${baseUrl}/disclaimer`, changefreq: "yearly", priority: 0.3 },
        { url: `${baseUrl}/refund`, changefreq: "yearly", priority: 0.3 },
        { url: `${baseUrl}/cookie-policy`, changefreq: "yearly", priority: 0.3 },
        { url: `${baseUrl}/accessibility`, changefreq: "yearly", priority: 0.3 },
      ];

      for (const page of staticPages) {
        urls.push(buildUrl(page.url, new Date().toISOString().split("T")[0], page.changefreq, page.priority));
      }
    }

    // Legal pages from database
    if (settings.includeLegalPages) {
      const legalPages = await LegalPage.find({ status: "published", isActive: true })
        .select("slug updatedAt")
        .lean();

      for (const page of legalPages) {
        const url = `${baseUrl}/${page.slug}`;
        urls.push(buildUrl(
          url,
          page.updatedAt ? new Date(page.updatedAt).toISOString().split("T")[0] : undefined,
          "monthly",
          0.5
        ));
      }
    }

    // Blog posts
    if (settings.includeBlogPosts) {
      const posts = await BlogPost.find({ status: "published" })
        .select("slug updatedAt")
        .lean();

      for (const post of posts) {
        const url = `${baseUrl}/blog/${post.slug}`;
        urls.push(buildUrl(
          url,
          post.updatedAt ? new Date(post.updatedAt).toISOString().split("T")[0] : undefined,
          "weekly",
          0.6
        ));
      }
    }

    // Products
    if (settings.includeProducts) {
      const products = await Product.find({ status: "published" })
        .select("slug updatedAt")
        .lean();

      for (const product of products) {
        const url = `${baseUrl}/products/${product.slug}`;
        urls.push(buildUrl(
          url,
          product.updatedAt ? new Date(product.updatedAt).toISOString().split("T")[0] : undefined,
          "weekly",
          0.6
        ));
      }
    }

    // Limit URLs to maxUrls setting
    const limitedUrls = urls.slice(0, settings.maxUrls || 50000);

    // Build XML
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml">
${limitedUrls.join("\n")}
</urlset>`;

    return new NextResponse(xml, {
      headers: {
        "Content-Type": "application/xml",
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch (error) {
    console.error("Sitemap generation error:", error);
    return NextResponse.json({ error: "Failed to generate sitemap" }, { status: 500 });
  }
}