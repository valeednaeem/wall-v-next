import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectToDatabase } from "@/lib/mongodb";
import SiteSettings from "@/models/site-settings";
import LegalPage from "@/models/legal-page";
import BlogPost from "@/models/blog-post";
import Product from "@/models/product";
import Page from "@/models/page";
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

    const permError = await requirePermission(jwtUser, "seo:view");
    if (permError) return permError;

    const body = await request.json();
    const { url } = body;

    await connectToDatabase();

    // Get Twitter settings
    const settings = await SiteSettings.find({ key: { $in: [
      "social.twitter.defaultCard",
      "social.twitter.defaultTitle",
      "social.twitter.defaultDescription",
      "social.twitter.defaultImage",
      "social.twitter.siteHandle",
      "social.twitter.creatorHandle",
      "social.twitter.pageOverrides",
      "seo.canonicalDomain",
    ]} }).lean();

    const getSetting = <T>(key: string, def: T): T => {
      const s = settings.find((st) => st.key === `social.twitter.${key}`) || settings.find((st) => st.key === key);
      if (!s?.value) return def;
      try {
        return JSON.parse(s.value) as T;
      } catch {
        return s.value as unknown as T;
      }
    };

    const canonicalDomain = getSetting<string>("canonicalDomain", process.env.NEXT_PUBLIC_APP_URL || "https://wall-v.com");
    const baseUrl = canonicalDomain.replace(/\/$/, "");

    // Determine which page we're previewing
    let card = getSetting<string>("defaultCard", "summary_large_image");
    let title = getSetting<string>("defaultTitle", "");
    let description = getSetting<string>("defaultDescription", "");
    let image = getSetting<string>("defaultImage", "");
    let siteHandle = getSetting<string>("siteHandle", "@wallv");
    let creatorHandle = getSetting<string>("creatorHandle", "@wallv");

    // Check for page-specific overrides
    const pageOverrides = getSetting<Record<string, { card?: string; title?: string; description?: string; image?: string }>>("pageOverrides", {});
    const pagePath = url.startsWith("/") ? url : "/" + url;
    if (pageOverrides[pagePath]) {
      const override = pageOverrides[pagePath];
      if (override.card) card = override.card;
      if (override.title) title = override.title;
      if (override.description) description = override.description;
      if (override.image) image = override.image;
    }

    // If it's a known page type, try to get dynamic data
    if (pagePath.startsWith("/products/")) {
      const slug = pagePath.replace("/products/", "");
      const product = await Product.findOne({ slug }).select("name description featuredImage seo").lean();
      if (product) {
        title = product.seo?.metaTitle || product.name;
        description = product.seo?.metaDescription || product.description;
        image = product.featuredImage;
        card = "summary_large_image";
      }
    } else if (pagePath.startsWith("/blog/")) {
      const slug = pagePath.replace("/blog/", "");
      const post = await BlogPost.findOne({ slug }).select("title excerpt featuredImage seo").lean();
      if (post) {
        title = post.seo?.metaTitle || post.title;
        description = post.seo?.metaDescription || post.excerpt;
        image = post.featuredImage;
        card = "summary_large_image";
      }
    } else if (pagePath !== "/") {
      const page = await Page.findOne({ slug: pagePath.slice(1) }).select("title seo").lean();
      if (page) {
        title = page.seo?.metaTitle || page.title;
        description = page.seo?.metaDescription || "";
      }
    }

    // Fallback image
    if (!image) {
      image = `${baseUrl}/twitter-default.png`;
    }

    return NextResponse.json({
      success: true,
      data: {
        url: pagePath,
        card,
        title,
        description,
        image,
        siteHandle,
        creatorHandle,
      },
    });
  } catch (error) {
    console.error("Twitter preview error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}