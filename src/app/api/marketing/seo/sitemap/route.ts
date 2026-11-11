import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectToDatabase } from "@/lib/mongodb";
import SitemapSettings from "@/models/sitemap-settings";
import { requirePermission } from "@/lib/api-middleware";

const SITEMAP_FIELDS = [
  "includePages",
  "includePosts",
  "includeProducts",
  "includeServices",
  "includeCategories",
  "includeTags",
  "includeLegal",
  "includePortfolio",
  "maxUrlsPerPage",
  "defaultPriority",
  "defaultChangeFreq",
  "customUrls",
  "excludePatterns",
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
    let settings = await SitemapSettings.findOne().lean();
    if (!settings) {
      settings = await SitemapSettings.create({});
    }

    return NextResponse.json({ success: true, data: settings });
  } catch (error) {
    console.error("Sitemap settings GET error:", error);
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

    const permError = await requirePermission(jwtUser, "seo:sitemap:manage");
    if (permError) return permError;

    const body = await request.json();
    await connectToDatabase();

    const settingsData: Record<string, unknown> = {};
    for (const field of SITEMAP_FIELDS) {
      if (body[field] !== undefined) {
        settingsData[field] = body[field];
      }
    }

    let settings = await SitemapSettings.findOne();
    if (!settings) {
      settings = await SitemapSettings.create(settingsData);
    } else {
      settings = await SitemapSettings.findByIdAndUpdate(settings._id, settingsData, { new: true });
    }

    return NextResponse.json({ success: true, data: settings });
  } catch (error) {
    console.error("Sitemap settings PUT error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}