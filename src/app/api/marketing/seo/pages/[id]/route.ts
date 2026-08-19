import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectToDatabase } from "@/lib/mongodb";
import LegalPage from "@/models/legal-page";
import { requirePermission } from "@/lib/api-middleware";

const ALLOWED_SEO_FIELDS = [
  "metaTitle",
  "metaDescription",
  "keywords",
  "canonicalUrl",
  "robots",
  "ogTitle",
  "ogDescription",
  "ogImage",
  "twitterTitle",
  "twitterDescription",
  "twitterImage",
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
    for (const field of ALLOWED_SEO_FIELDS) {
      if (body[field] !== undefined) {
        seoUpdate[`seo.${field}`] = body[field];
      }
    }

    if (Object.keys(seoUpdate).length === 0) {
      return NextResponse.json({ success: false, error: "No valid SEO fields provided" }, { status: 400 });
    }

    const page = await LegalPage.findByIdAndUpdate(
      id,
      { $set: seoUpdate },
      { new: true }
    ).select("slug title seo status");

    if (!page) {
      return NextResponse.json({ success: false, error: "Page not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: page });
  } catch (error) {
    console.error("Page SEO PUT error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}