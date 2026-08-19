import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectToDatabase } from "@/lib/mongodb";
import SiteSettings from "@/models/site-settings";
import { requirePermission } from "@/lib/api-middleware";

const GLOBAL_SEO_KEYS = [
  "siteTitle",
  "siteDescription",
  "defaultKeywords",
  "canonicalDomain",
  "defaultOGImage",
  "defaultTwitterImage",
  "siteName",
  "author",
  "organizationName",
  "organizationUrl",
  "logo",
  "defaultRobots",
  "twitterHandle",
  "facebookAppId",
];

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
    const settings = await SiteSettings.find({ key: { $in: GLOBAL_SEO_KEYS.map((k) => `seo.${k}`) } }).lean();

    const result: Record<string, unknown> = {};
    for (const key of GLOBAL_SEO_KEYS) {
      const setting = settings.find((s) => s.key === `seo.${key}`);
      result[key] = setting?.value ?? "";
    }

    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    console.error("Global SEO GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
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

    const body = await request.json();
    await connectToDatabase();

    const updates = [];
    for (const key of GLOBAL_SEO_KEYS) {
      if (body[key] !== undefined) {
        updates.push(
          SiteSettings.findOneAndUpdate(
            { key: `seo.${key}` },
            { key: `seo.${key}`, value: body[key], category: "seo", updatedAt: new Date() },
            { upsert: true, new: true }
          )
        );
      }
    }
    await Promise.all(updates);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Global SEO PUT error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}