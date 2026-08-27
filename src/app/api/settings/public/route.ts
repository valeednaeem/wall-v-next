import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import SiteSettings from "@/models/site-settings";
import User from "@/models/user";

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

    // Fall back to admin profile for contact info if SiteSettings not configured
    let adminProfile: Record<string, unknown> = {};
    if (!grouped.contact?.email && !grouped.contact?.phone && !grouped.contact?.address) {
      const admin = await User.findOne({ role: { $in: ["super-admin", "admin"] } }).select("name email phone company location").lean();
      if (admin) {
        adminProfile = {
          email: admin.email || "",
          phone: admin.phone || "",
          address: [admin.company, admin.location].filter(Boolean).join("\n") || "",
        };
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        site: {
          siteName: grouped.site?.siteName || "Wall-V",
          logo: grouped.site?.logo || "",
          favicon: grouped.site?.favicon || "",
          tagline: grouped.site?.tagline || "",
        },
        seo: {
          metaTitle: grouped.seo?.metaTitle || "",
          metaDescription: grouped.seo?.metaDescription || "",
          keywords: grouped.seo?.keywords || [],
          ogImage: grouped.seo?.ogImage || "",
          googleTagManagerId: grouped.seo?.googleTagManagerId || "",
        },
        social: {
          facebook: grouped.socialMedia?.facebook || "",
          twitter: grouped.socialMedia?.twitter || "",
          instagram: grouped.socialMedia?.instagram || "",
          linkedin: grouped.socialMedia?.linkedin || "",
          youtube: grouped.socialMedia?.youtube || "",
          github: grouped.socialMedia?.github || "",
        },
        voice: {
          enabled: grouped.voice?.enabled ?? true,
          widgetUrl: grouped.voice?.widgetUrl || process.env.NEXT_PUBLIC_DOGRAH_WIDGET_URL || "",
          apiUrl: grouped.voice?.apiUrl || process.env.DOGRAH_API_URL || "",
        },
        contact: {
          email: grouped.contact?.email || adminProfile.email || "info@wall-v.com",
          phone: grouped.contact?.phone || adminProfile.phone || "+92 300 1234567",
          address: grouped.contact?.address || adminProfile.address || "Wall-V Technologies\nKarachi, Pakistan",
          businessHours: grouped.contact?.businessHours || "Monday - Friday: 9:00 AM - 6:00 PM\nSaturday: 10:00 AM - 2:00 PM",
        },
      },
    });
  } catch (error) {
    console.error("Public settings GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
