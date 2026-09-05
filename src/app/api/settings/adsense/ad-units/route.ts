import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getAdSenseSettings, saveAdSenseSettings } from "@/lib/adsense";

const ALLOWED_ROLES = ["super-admin", "admin", "manager"];

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ success: false, error: "UNAUTHORIZED", message: "Your session has expired. Please sign in again." }, { status: 401 });
    }
    if (!ALLOWED_ROLES.includes(session.user.role)) {
      return NextResponse.json({ success: false, error: "FORBIDDEN", message: "You do not have permission to manage ad units." }, { status: 403 });
    }

    const config = await getAdSenseSettings();
    return NextResponse.json({ success: true, data: config.adUnits });
  } catch (error) {
    console.error("Ad units GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ success: false, error: "UNAUTHORIZED", message: "Your session has expired. Please sign in again." }, { status: 401 });
    }
    if (!ALLOWED_ROLES.includes(session.user.role)) {
      return NextResponse.json({ success: false, error: "FORBIDDEN", message: "You do not have permission to manage ad units." }, { status: 403 });
    }

    const body = await request.json();
    const { name, format, slot, size, placement } = body;

    if (!name || !format || !slot) {
      return NextResponse.json({ success: false, error: "Name, format, and slot are required." }, { status: 400 });
    }

    const config = await getAdSenseSettings();

    const newUnit = {
      id: `ad-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      name,
      format: format || "display",
      slot,
      size: size || "fluid",
      placement: placement || "",
      enabled: true,
    };

    await saveAdSenseSettings({
      adUnits: [...config.adUnits, newUnit],
    });

    return NextResponse.json({ success: true, data: newUnit }, { status: 201 });
  } catch (error) {
    console.error("Ad unit POST error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
