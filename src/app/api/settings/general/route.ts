import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import SiteSettings from "@/models/site-settings";
import { auth } from "@/lib/auth";

const ALLOWED_ROLES = ["super-admin", "admin", "manager"];

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user || !ALLOWED_ROLES.includes((session.user as Record<string, unknown>).role as string)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectToDatabase();
    const settings = await SiteSettings.find().lean();
    const grouped: Record<string, Record<string, unknown>> = {};
    settings.forEach((s: { category: string; key: string; value: unknown }) => {
      if (!grouped[s.category]) grouped[s.category] = {};
      grouped[s.category][s.key] = s.value;
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
    if (!session?.user || !ALLOWED_ROLES.includes((session.user as Record<string, unknown>).role as string)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("General settings PUT error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
