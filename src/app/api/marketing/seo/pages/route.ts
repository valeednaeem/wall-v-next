import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectToDatabase } from "@/lib/mongodb";
import LegalPage from "@/models/legal-page";
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

    const pages = await LegalPage.find({})
      .select("slug title seo status")
      .sort({ title: 1 })
      .lean();

    return NextResponse.json({ success: true, data: pages });
  } catch (error) {
    console.error("Pages SEO GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}