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

    // Build structured address from contact settings (single source of truth)
    const contact = grouped.contact || {};
    const addressParts = [
      contact.addressLine1,
      contact.addressLine2,
      contact.city,
      contact.state,
      contact.postalCode,
      contact.country,
    ].filter(Boolean);
    const fullAddress = addressParts.join(", ") || "1692, B Block, Master City Housing Society, Near Peoples Colony, Gujranwala, Pakistan";

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
          email: contact.email || "info@wall-v.com",
          phone: contact.phone || "+92 300 1234567",
          address: fullAddress,
          addressLine1: contact.addressLine1 || "",
          addressLine2: contact.addressLine2 || "",
          city: contact.city || "",
          state: contact.state || "",
          postalCode: contact.postalCode || "",
          country: contact.country || "",
          businessHours: contact.businessHours || "Monday - Friday: 9:00 AM - 6:00 PM\nSaturday: 10:00 AM - 2:00 PM",
          latitude: contact.latitude || 32.1878,
          longitude: contact.longitude || 74.1945,
        },
      },
    });
  } catch (error) {
    console.error("Public settings GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
