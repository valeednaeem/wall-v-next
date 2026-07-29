import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import SitemapSettings from "@/models/sitemap-settings";
import { getAuthUser } from "@/lib/auth";

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
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectToDatabase();
    const body = await request.json();

    let settings = await SitemapSettings.findOne();
    if (!settings) {
      settings = await SitemapSettings.create(body);
    } else {
      settings = await SitemapSettings.findByIdAndUpdate(settings._id, body, { new: true });
    }

    return NextResponse.json({ success: true, data: settings });
  } catch (error) {
    console.error("Sitemap settings PUT error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
