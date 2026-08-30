import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectToDatabase } from "@/lib/mongodb";
import Product from "@/models/product";
import { requirePermission } from "@/lib/api-middleware";

export async function GET(request: Request) {
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

    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type");

    await connectToDatabase();

    const query: Record<string, unknown> = {};
    if (type) query.type = type;

    const products = await Product.find(query)
      .select("slug name type status price featuredImage seo social")
      .sort({ name: 1 })
      .lean();

    return NextResponse.json({ success: true, data: products });
  } catch (error) {
    console.error("Products SEO GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}