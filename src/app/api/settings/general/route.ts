import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import SiteSettings from "@/models/site-settings";
import GoogleServiceConfig from "@/models/google-services";
import { auth } from "@/lib/auth";

const ALLOWED_ROLES = ["super-admin", "admin", "manager"];

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ success: false, error: "UNAUTHORIZED", message: "Your session has expired. Please sign in again." }, { status: 401 });
    }
    if (!ALLOWED_ROLES.includes(session.user.role)) {
      return NextResponse.json({ success: false, error: "FORBIDDEN", message: "You do not have permission to manage site settings." }, { status: 403 });
    }

    await connectToDatabase();
    const settings = await SiteSettings.find().lean();
    const grouped: Record<string, Record<string, unknown>> = {};
    settings.forEach((s: { category: string; key: string; value: unknown }) => {
      if (!grouped[s.category]) grouped[s.category] = {};
      const shortKey = s.key.replace(`${s.category}.`, "");
      grouped[s.category][shortKey] = s.value;
    });

    return NextResponse.json({ success: true, data: grouped });
  } catch (error) {
    console.error("General settings GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ success: false, error: "UNAUTHORIZED", message: "Your session has expired. Please sign in again." }, { status: 401 });
    }
    if (!ALLOWED_ROLES.includes(session.user.role)) {
      return NextResponse.json({ success: false, error: "FORBIDDEN", message: "You do not have permission to manage site settings." }, { status: 403 });
    }

    const body = await request.json();
    await connectToDatabase();

    const updates = [];
    for (const [category, keys] of Object.entries(body) as [string, Record<string, unknown>][]) {
      for (const [key, value] of Object.entries(keys)) {
        updates.push(
          SiteSettings.findOneAndUpdate(
            { key: `${category}.${key}` },
            { key: `${category}.${key}`, value, category, updatedAt: new Date() },
            { upsert: true, new: true }
          )
        );
      }
    }
    await Promise.all(updates);

    if (body.seo?.googleAnalyticsId !== undefined) {
      const measurementId = body.seo.googleAnalyticsId as string;
      await GoogleServiceConfig.findOneAndUpdate(
        { serviceId: "analytics" },
        {
          $set: {
            config: { measurementId },
            enabled: !!measurementId,
            status: measurementId ? "connected" : "not_configured",
          },
        },
        { upsert: true }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("General settings PUT error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
