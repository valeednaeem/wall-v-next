import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectToDatabase } from "@/lib/mongodb";
import Product from "@/models/product";
import BlogPost from "@/models/blog-post";
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

    const issues: SEOIssue[] = [];
    let totalPages = 0;

    // Check Products
    const products = await Product.find({ status: "published" }).select("slug name seo featuredImage price stock type category").populate("category").lean();
    for (const product of products) {
      totalPages++;
      const url = `/products/${product.slug}`;
      const seo = product.seo || {};

      if (!seo.metaTitle || seo.metaTitle.trim() === "") {
        issues.push({ type: "critical", page: url, pageType: "product", field: "metaTitle", message: "Missing SEO title" });
      } else {
        issues.push({ type: "passed", page: url, pageType: "product", field: "metaTitle", message: "SEO title present" });
      }

      if (!seo.metaDescription || seo.metaDescription.trim() === "") {
        issues.push({ type: "critical", page: url, pageType: "product", field: "metaDescription", message: "Missing SEO description" });
      } else {
        issues.push({ type: "passed", page: url, pageType: "product", field: "metaDescription", message: "SEO description present" });
      }

      if (!seo.canonicalUrl) {
        issues.push({ type: "warning", page: url, pageType: "product", field: "canonicalUrl", message: "No canonical URL set (will use default)" });
      } else {
        issues.push({ type: "passed", page: url, pageType: "product", field: "canonicalUrl", message: "Canonical URL set" });
      }

      if (!product.featuredImage) {
        issues.push({ type: "critical", page: url, pageType: "product", field: "ogImage", message: "Missing featured image (used for OG)" });
      } else {
        issues.push({ type: "passed", page: url, pageType: "product", field: "ogImage", message: "OG image available" });
      }

      // Product schema fields
      if (product.price <= 0) {
        issues.push({ type: "critical", page: url, pageType: "product", field: "price", message: "Invalid price for Product schema" });
      }
      if (!product.stock && product.stock !== 0) {
        issues.push({ type: "warning", page: url, pageType: "product", field: "availability", message: "Stock not set (affects schema availability)" });
      }
    }

    // Check Blog Posts
    const posts = await BlogPost.find({ status: "published" }).select("slug title excerpt featuredImage seo author category publishedAt").populate("author category").lean();
    for (const post of posts) {
      totalPages++;
      const url = `/blog/${post.slug}`;
      const seo = post.seo || {};

      if (!seo.metaTitle || seo.metaTitle.trim() === "") {
        issues.push({ type: "critical", page: url, pageType: "blog", field: "metaTitle", message: "Missing SEO title" });
      } else {
        issues.push({ type: "passed", page: url, pageType: "blog", field: "metaTitle", message: "SEO title present" });
      }

      if (!seo.metaDescription || seo.metaDescription.trim() === "") {
        issues.push({ type: "critical", page: url, pageType: "blog", field: "metaDescription", message: "Missing SEO description" });
      } else {
        issues.push({ type: "passed", page: url, pageType: "blog", field: "metaDescription", message: "SEO description present" });
      }

      if (!post.featuredImage) {
        issues.push({ type: "critical", page: url, pageType: "blog", field: "ogImage", message: "Missing featured image (used for OG)" });
      } else {
        issues.push({ type: "passed", page: url, pageType: "blog", field: "ogImage", message: "OG image available" });
      }

      if (!post.publishedAt) {
        issues.push({ type: "warning", page: url, pageType: "blog", field: "datePublished", message: "No publish date (affects Article schema)" });
      }

      if (!post.author) {
        issues.push({ type: "warning", page: url, pageType: "blog", field: "author", message: "No author (affects Article schema)" });
      }
    }

    // Count stats
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
        issues: issues.filter((i) => i.type !== "passed"), // Only return issues
      },
    });
  } catch (error) {
    console.error("SEO health check error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST() {
  // Same as GET but triggered manually
  return GET();
}