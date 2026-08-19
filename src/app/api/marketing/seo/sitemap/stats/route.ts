import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectToDatabase } from "@/lib/mongodb";
import BlogPost from "@/models/blog-post";
import Product from "@/models/product";
import LegalPage from "@/models/legal-page";
import BlogCategory from "@/models/blog-category";
import ProductCategory from "@/models/product-category";
import BlogTag from "@/models/blog-tag";
import SitemapSettings from "@/models/sitemap-settings";
import { requirePermission } from "@/lib/api-middleware";

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

    // Get settings to know what to include
    const settings = await SitemapSettings.findOne().lean();

    const counts = {
      totalUrls: 0,
      pagesCount: 0,
      postsCount: 0,
      productsCount: 0,
      servicesCount: 0,
      categoriesCount: 0,
      tagsCount: 0,
      legalCount: 0,
      portfolioCount: 0,
      customCount: 0,
    };

    // Count pages (legal pages + static pages)
    if (settings?.includePages) {
      const legalPages = await LegalPage.countDocuments({ status: "published", isActive: true });
      // Add static pages count (14 static pages)
      counts.pagesCount = legalPages + 14;
      counts.totalUrls += counts.pagesCount;
    }

    // Count blog posts
    if (settings?.includePosts) {
      const posts = await BlogPost.countDocuments({ status: "published" });
      counts.postsCount = posts;
      counts.totalUrls += posts;
    }

    // Count products
    if (settings?.includeProducts) {
      const products = await Product.countDocuments({ status: "published" });
      counts.productsCount = products;
      counts.totalUrls += products;
    }

    // Count categories
    if (settings?.includeCategories) {
      const [productCats, blogCats] = await Promise.all([
        ProductCategory.countDocuments({ status: "active" }),
        BlogCategory.countDocuments({ status: "active" }),
      ]);
      counts.categoriesCount = productCats + blogCats;
      counts.totalUrls += counts.categoriesCount;
    }

    // Count tags
    if (settings?.includeTags) {
      const tags = await BlogTag.countDocuments();
      counts.tagsCount = tags;
      counts.totalUrls += tags;
    }

    // Custom URLs
    if (settings?.customUrls) {
      const activeCustom = settings.customUrls.filter((u: any) => u.isActive).length;
      counts.customCount = activeCustom;
      counts.totalUrls += activeCustom;
    }

    return NextResponse.json({ success: true, data: counts });
  } catch (error) {
    console.error("Sitemap stats error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}