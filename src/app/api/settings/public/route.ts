import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import SiteSettings from "@/models/site-settings";

export async function GET() {
  try {
    await connectToDatabase();
    const settings = await SiteSettings.find().lean();
    const grouped: Record<string, Record<string, unknown>> = {};
    settings.forEach((s: { category: string; key: string; value: unknown }) => {
      if (!grouped[s.category]) grouped[s.category] = {};
      const shortKey = s.key.replace(`${s.category}.`, "");
      grouped[s.category][shortKey] = s.value;
    });

    return NextResponse.json({
      success: true,
      data: {
        siteName: grouped.site?.siteName || "Wall-V",
        logo: grouped.site?.logo || "",
        favicon: grouped.site?.favicon || "",
      },
    });
  } catch (error) {
    console.error("Public settings GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
