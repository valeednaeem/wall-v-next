import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectToDatabase } from "@/lib/mongodb";
import SiteSettings from "@/models/site-settings";
import LegalPage from "@/models/legal-page";
import BlogPost from "@/models/blog-post";
import Product from "@/models/product";
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

    // Get OG settings
    const settings = await SiteSettings.find({ key: { $in: [
      "social.og.defaultTitle",
      "social.og.defaultDescription",
      "social.og.defaultImage",
      "social.og.defaultType",
      "social.og.siteName",
      "social.og.twitterHandle",
      "social.og.facebookAppId",
      "social.og.locale",
      "social.og.pageOverrides",
      "seo.canonicalDomain",
    ]} }).lean();

    const getSetting = (key: string, def: string = "") => {
      const s = settings.find((st) => st.key === `social.og.${key}`) || settings.find((st) => st.key === key);
      return s?.value ?? def;
    };

    const canonicalDomain = getSetting("canonicalDomain", process.env.NEXT_PUBLIC_APP_URL || "https://wall-v.com");
    const baseUrl = canonicalDomain.replace(/\/$/, "");

    // Determine which page we're previewing
    let title = getSetting("defaultTitle");
    let description = getSetting("defaultDescription");
    let image = getSetting("defaultImage");
    let type = getSetting("defaultType", "website");
    let siteName = getSetting("siteName", "Wall-V");
    let locale = getSetting("locale", "en_US");

    // Check for page-specific overrides
    const pageOverrides = getSetting("pageOverrides", {});
    const pagePath = url.startsWith("/") ? url : "/" + url;
    if (pageOverrides[pagePath]) {
      const override = pageOverrides[pagePath];
      if (override.title) title = override.title;
      if (override.description) description = override.description;
      if (override.image) image = override.image;
      if (override.type) type = override.type;
    }

    // If it's a known page type, try to get dynamic data
    if (pagePath.startsWith("/products/")) {
      const slug = pagePath.replace("/products/", "");
      const product = await Product.findOne({ slug }).select("name description featuredImage seo").lean();
      if (product) {
        title = product.seo?.metaTitle || product.name;
        description = product.seo?.metaDescription || product.description;
        image = product.featuredImage;
        type = "product";
      }
    } else if (pagePath.startsWith("/blog/")) {
      const slug = pagePath.replace("/blog/", "");
      const post = await BlogPost.findOne({ slug }).select("title excerpt featuredImage seo").lean();
      if (post) {
        title = post.seo?.metaTitle || post.title;
        description = post.seo?.metaDescription || post.excerpt;
        image = post.featuredImage;
        type = "article";
      }
    } else if (pagePath !== "/") {
      const page = await LegalPage.findOne({ slug: pagePath.slice(1) }).select("title seo").lean();
      if (page) {
        title = page.seo?.metaTitle || page.title;
        description = page.seo?.metaDescription || "";
      }
    }

    // Fallback image
    if (!image) {
      image = `${baseUrl}/og-default.png`;
    }

    return NextResponse.json({
      success: true,
      data: {
        url: pagePath,
        title,
        description,
        image,
        type,
        siteName,
      },
    });
  } catch (error) {
    console.error("OG preview error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}