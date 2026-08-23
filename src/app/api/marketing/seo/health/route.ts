import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectToDatabase } from "@/lib/mongodb";
import Product from "@/models/product";
import BlogPost from "@/models/blog-post";
import LegalPage from "@/models/legal-page";
import RobotsSettings from "@/models/robots-settings";
import SitemapSettings from "@/models/sitemap-settings";
import SiteSettings from "@/models/site-settings";
import { requirePermission } from "@/lib/api-middleware";

interface SEOIssue {
  type: "critical" | "warning" | "passed";
  page: string;
  pageType: string;
  field: string;
  message: string;
}

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ success: false, error: "UNAUTHORIZED", message: "Your session has expired. Please sign in again." }, { status: 401 });
    }

    const jwtUser = {
      userId: session.user.id,
      email: session.user.email || null,
      role: (session.user as { role?: string }).role || "customer",
      permissions: (session.user as { permissions?: string[] }).permissions || [],
    };

    const permError = await requirePermission(jwtUser, "seo:view");
    if (permError) return permError;

    await connectToDatabase();

    const issues: SEOIssue[] = [];
    let totalPages = 0;
    const allTitles: string[] = [];
    const allDescriptions: string[] = [];

    // ── Products ──────────────────────────────────────────────
    const products = await Product.find({ status: "published" })
      .select("slug name seo featuredImage price stock type category description shortDescription")
      .populate("category")
      .lean();

    for (const product of products) {
      totalPages++;
      const url = `/products/${product.slug}`;
      const seo = product.seo || {};

      // Title
      if (!seo.metaTitle || seo.metaTitle.trim() === "") {
        issues.push({ type: "critical", page: url, pageType: "product", field: "metaTitle", message: "Missing SEO title" });
      } else {
        allTitles.push(seo.metaTitle.trim().toLowerCase());
        issues.push({ type: "passed", page: url, pageType: "product", field: "metaTitle", message: "SEO title present" });
      }

      // Description
      if (!seo.metaDescription || seo.metaDescription.trim() === "") {
        issues.push({ type: "critical", page: url, pageType: "product", field: "metaDescription", message: "Missing SEO description" });
      } else {
        allDescriptions.push(seo.metaDescription.trim().toLowerCase());
        issues.push({ type: "passed", page: url, pageType: "product", field: "metaDescription", message: "SEO description present" });
      }

      // Canonical URL
      if (!seo.canonicalUrl) {
        issues.push({ type: "warning", page: url, pageType: "product", field: "canonicalUrl", message: "No canonical URL set" });
      } else {
        issues.push({ type: "passed", page: url, pageType: "product", field: "canonicalUrl", message: "Canonical URL set" });
      }

      // OG Image
      if (!product.featuredImage && !seo.ogImage) {
        issues.push({ type: "critical", page: url, pageType: "product", field: "ogImage", message: "Missing featured image (no OG image)" });
      } else {
        issues.push({ type: "passed", page: url, pageType: "product", field: "ogImage", message: "OG image available" });
      }

      // Product schema fields
      if (!product.price || product.price <= 0) {
        issues.push({ type: "critical", page: url, pageType: "product", field: "price", message: "Invalid price for Product schema" });
      } else {
        issues.push({ type: "passed", page: url, pageType: "product", field: "price", message: "Product price valid" });
      }
      if (product.stock === undefined || product.stock === null) {
        issues.push({ type: "warning", page: url, pageType: "product", field: "availability", message: "Stock not set (affects schema availability)" });
      } else {
        issues.push({ type: "passed", page: url, pageType: "product", field: "availability", message: "Stock status set" });
      }

      // Robots / noindex
      if (seo.robots && seo.robots.includes("noindex")) {
        issues.push({ type: "warning", page: url, pageType: "product", field: "noindex", message: "Page is set to noindex" });
      }
    }

    // ── Blog Posts ────────────────────────────────────────────
    const posts = await BlogPost.find({ status: "published" })
      .select("slug title excerpt featuredImage seo author category publishedAt")
      .populate("author category")
      .lean();

    for (const post of posts) {
      totalPages++;
      const url = `/blog/${post.slug}`;
      const seo = post.seo || {};

      // Title
      if (!seo.metaTitle || seo.metaTitle.trim() === "") {
        issues.push({ type: "critical", page: url, pageType: "blog", field: "metaTitle", message: "Missing SEO title" });
      } else {
        allTitles.push(seo.metaTitle.trim().toLowerCase());
        issues.push({ type: "passed", page: url, pageType: "blog", field: "metaTitle", message: "SEO title present" });
      }

      // Description
      if (!seo.metaDescription || seo.metaDescription.trim() === "") {
        issues.push({ type: "critical", page: url, pageType: "blog", field: "metaDescription", message: "Missing SEO description" });
      } else {
        allDescriptions.push(seo.metaDescription.trim().toLowerCase());
        issues.push({ type: "passed", page: url, pageType: "blog", field: "metaDescription", message: "SEO description present" });
      }

      // OG Image
      if (!post.featuredImage && !seo.ogImage) {
        issues.push({ type: "critical", page: url, pageType: "blog", field: "ogImage", message: "Missing featured image (no OG image)" });
      } else {
        issues.push({ type: "passed", page: url, pageType: "blog", field: "ogImage", message: "OG image available" });
      }

      // Article schema fields
      if (!post.publishedAt) {
        issues.push({ type: "warning", page: url, pageType: "blog", field: "datePublished", message: "No publish date (affects Article schema)" });
      } else {
        issues.push({ type: "passed", page: url, pageType: "blog", field: "datePublished", message: "Publish date set" });
      }
      if (!post.author) {
        issues.push({ type: "warning", page: url, pageType: "blog", field: "author", message: "No author (affects Article schema)" });
      } else {
        issues.push({ type: "passed", page: url, pageType: "blog", field: "author", message: "Author set" });
      }

      // Robots / noindex
      if (seo.robots && seo.robots.includes("noindex")) {
        issues.push({ type: "warning", page: url, pageType: "blog", field: "noindex", message: "Page is set to noindex" });
      }
    }

    // ── Legal Pages ───────────────────────────────────────────
    const legalPages = await LegalPage.find({ status: "published" })
      .select("slug title seo type")
      .lean();

    for (const page of legalPages) {
      totalPages++;
      const url = `/${page.slug}`;
      const seo = page.seo || {};

      if (!seo.metaTitle || seo.metaTitle.trim() === "") {
        issues.push({ type: "critical", page: url, pageType: "legal", field: "metaTitle", message: "Missing SEO title" });
      } else {
        allTitles.push(seo.metaTitle.trim().toLowerCase());
        issues.push({ type: "passed", page: url, pageType: "legal", field: "metaTitle", message: "SEO title present" });
      }

      if (!seo.metaDescription || seo.metaDescription.trim() === "") {
        issues.push({ type: "critical", page: url, pageType: "legal", field: "metaDescription", message: "Missing SEO description" });
      } else {
        allDescriptions.push(seo.metaDescription.trim().toLowerCase());
        issues.push({ type: "passed", page: url, pageType: "legal", field: "metaDescription", message: "SEO description present" });
      }

      if (seo.robots && seo.robots.includes("noindex")) {
        issues.push({ type: "warning", page: url, pageType: "legal", field: "noindex", message: "Page is set to noindex" });
      }
    }

    // ── Duplicate Detection ───────────────────────────────────
    const titleCounts = new Map<string, number>();
    for (const t of allTitles) titleCounts.set(t, (titleCounts.get(t) || 0) + 1);
    for (const [title, count] of titleCounts) {
      if (count > 1) {
        issues.push({ type: "critical", page: "global", pageType: "site", field: "duplicateTitle", message: `Duplicate title found on ${count} pages: "${title.substring(0, 60)}..."` });
      }
    }

    const descCounts = new Map<string, number>();
    for (const d of allDescriptions) descCounts.set(d, (descCounts.get(d) || 0) + 1);
    for (const [desc, count] of descCounts) {
      if (count > 1) {
        issues.push({ type: "critical", page: "global", pageType: "site", field: "duplicateDescription", message: `Duplicate description found on ${count} pages: "${desc.substring(0, 60)}..."` });
      }
    }

    // ── Site-wide Checks ──────────────────────────────────────

    // Robots.txt
    const robotsSettings = await RobotsSettings.findOne().lean();
    if (!robotsSettings) {
      issues.push({ type: "warning", page: "global", pageType: "site", field: "robotsTxt", message: "Robots.txt not configured" });
    } else {
      issues.push({ type: "passed", page: "global", pageType: "site", field: "robotsTxt", message: "Robots.txt configured" });
    }

    // Sitemap
    const sitemapSettings = await SitemapSettings.findOne().lean();
    if (!sitemapSettings) {
      issues.push({ type: "warning", page: "global", pageType: "site", field: "sitemap", message: "Sitemap settings not configured" });
    } else {
      issues.push({ type: "passed", page: "global", pageType: "site", field: "sitemap", message: "Sitemap settings configured" });
    }

    // Global SEO defaults
    const seoSettings = await SiteSettings.find({ category: "seo" }).lean();
    const seoMap = new Map(seoSettings.map((s) => [s.key, s.value]));
    if (!seoMap.get("seo.metaTitle") && !seoMap.get("seo.defaultMetaTitle")) {
      issues.push({ type: "warning", page: "global", pageType: "site", field: "globalTitle", message: "No global default meta title configured" });
    } else {
      issues.push({ type: "passed", page: "global", pageType: "site", field: "globalTitle", message: "Global meta title configured" });
    }
    if (!seoMap.get("seo.metaDescription") && !seoMap.get("seo.defaultMetaDescription")) {
      issues.push({ type: "warning", page: "global", pageType: "site", field: "globalDescription", message: "No global default meta description configured" });
    } else {
      issues.push({ type: "passed", page: "global", pageType: "site", field: "globalDescription", message: "Global meta description configured" });
    }

    // OG defaults
    const socialSettings = await SiteSettings.find({ category: "social" }).lean();
    const socialMap = new Map(socialSettings.map((s) => [s.key, s.value]));
    if (!socialMap.get("social.ogImage")) {
      issues.push({ type: "warning", page: "global", pageType: "site", field: "globalOgImage", message: "No default OG image configured" });
    } else {
      issues.push({ type: "passed", page: "global", pageType: "site", field: "globalOgImage", message: "Default OG image configured" });
    }

    // Count stats (excluding passed)
    const critical = issues.filter((i) => i.type === "critical").length;
    const warnings = issues.filter((i) => i.type === "warning").length;
    const passed = issues.filter((i) => i.type === "passed").length;

    return NextResponse.json({
      success: true,
      data: {
        totalPages,
        passed,
        warnings,
        critical,
        lastChecked: new Date().toISOString(),
        issues: issues.filter((i) => i.type !== "passed"),
      },
    });
  } catch (error) {
    console.error("SEO health check error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST() {
  return GET();
}
