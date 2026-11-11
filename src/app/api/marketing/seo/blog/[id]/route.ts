import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectToDatabase } from "@/lib/mongodb";
import BlogPost from "@/models/blog-post";
import { requirePermission } from "@/lib/api-middleware";

const ALLOWED_SEO_FIELDS = [
  "metaTitle",
  "metaDescription",
  "keywords",
];

const ALLOWED_SOCIAL_FIELDS = [
  "ogImage",
  "twitterHandle",
];

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const permError = await requirePermission(jwtUser, "seo:manage");
    if (permError) return permError;

    const { id } = await params;
    const body = await request.json();
    await connectToDatabase();

    // Filter only allowed SEO fields
    const seoUpdate: Record<string, unknown> = {};
    const socialUpdate: Record<string, unknown> = {};

    for (const field of ALLOWED_SEO_FIELDS) {
      if (body[field] !== undefined) {
        seoUpdate[`seo.${field}`] = body[field];
      }
    }

    for (const field of ALLOWED_SOCIAL_FIELDS) {
      if (body[field] !== undefined) {
        socialUpdate[`social.${field}`] = body[field];
      }
    }

    if (Object.keys(seoUpdate).length === 0 && Object.keys(socialUpdate).length === 0) {
      return NextResponse.json({ success: false, error: "No valid SEO/social fields provided" }, { status: 400 });
    }

    const update = { ...seoUpdate, ...socialUpdate };

    const post = await BlogPost.findByIdAndUpdate(
      id,
      { $set: update },
      { new: true }
    ).select("slug title excerpt status featuredImage author category publishedAt seo social")
      .populate("author", "name")
      .populate("category", "name");

    if (!post) {
      return NextResponse.json({ success: false, error: "Blog post not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: post });
  } catch (error) {
    console.error("Blog SEO PUT error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}