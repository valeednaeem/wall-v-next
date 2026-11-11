import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectToDatabase } from "@/lib/mongodb";
import SiteSettings from "@/models/site-settings";
import { requirePermission } from "@/lib/api-middleware";

const TWITTER_KEYS = [
  "defaultCard",
  "defaultTitle",
  "defaultDescription",
  "defaultImage",
  "siteHandle",
  "creatorHandle",
  "pageOverrides",
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
    const settings = await SiteSettings.find({ key: { $in: TWITTER_KEYS.map((k) => `social.twitter.${k}`) } }).lean();

    const result: Record<string, unknown> = {};
    for (const key of TWITTER_KEYS) {
      const setting = settings.find((s) => s.key === `social.twitter.${key}`);
      result[key] = setting?.value ?? (key === "defaultCard" ? "summary_large_image" : key === "pageOverrides" ? {} : "");
    }

    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    console.error("Twitter settings GET error:", error);
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
    for (const key of TWITTER_KEYS) {
      if (body[key] !== undefined) {
        updates.push(
          SiteSettings.findOneAndUpdate(
            { key: `social.twitter.${key}` },
            { key: `social.twitter.${key}`, value: body[key], category: "social.twitter", updatedAt: new Date() },
            { upsert: true, new: true }
          )
        );
      }
    }
    await Promise.all(updates);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Twitter settings PUT error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}