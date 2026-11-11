import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import SitemapSettings from "@/models/sitemap-settings";
import { auth } from "@/lib/auth";
import { pickFields } from "@/lib/pick-fields";

const SITEMAP_FIELDS = ["includePages", "includePosts", "includeProducts", "includeServices", "includeCategories", "includeTags", "includeLegal", "includePortfolio", "defaultPriority", "defaultChangeFreq"];

export async function GET() {
  try {
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
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userRole = (session.user as { role?: string }).role;
    if (!["super-admin", "admin"].includes(userRole || "")) {
      return NextResponse.json({ error: "Forbidden: insufficient permissions" }, { status: 403 });
    }

    await connectToDatabase();
    const body = await request.json();
    const settingsData = pickFields(body, SITEMAP_FIELDS);

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
