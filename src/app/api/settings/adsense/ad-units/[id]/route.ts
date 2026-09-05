import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getAdSenseSettings, saveAdSenseSettings } from "@/lib/adsense";

const ALLOWED_ROLES = ["super-admin", "admin", "manager"];

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function PUT(request: Request, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ success: false, error: "UNAUTHORIZED", message: "Your session has expired. Please sign in again." }, { status: 401 });
    }
    if (!ALLOWED_ROLES.includes(session.user.role)) {
      return NextResponse.json({ success: false, error: "FORBIDDEN", message: "You do not have permission to manage ad units." }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();

    const config = await getAdSenseSettings();
    const index = config.adUnits.findIndex((u) => u.id === id);
    if (index === -1) {
      return NextResponse.json({ success: false, error: "Ad unit not found." }, { status: 404 });
    }

    const updated = await saveAdSenseSettings({
      adUnits: config.adUnits.map((u) => (u.id === id ? { ...u, ...body, id } : u)),
    });

    return NextResponse.json({ success: true, data: updated.adUnits.find((u) => u.id === id) });
  } catch (error) {
    console.error("Ad unit PUT error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ success: false, error: "UNAUTHORIZED", message: "Your session has expired. Please sign in again." }, { status: 401 });
    }
    if (!ALLOWED_ROLES.includes(session.user.role)) {
      return NextResponse.json({ success: false, error: "FORBIDDEN", message: "You do not have permission to manage ad units." }, { status: 403 });
    }

    const { id } = await params;

    const config = await getAdSenseSettings();
    const filtered = config.adUnits.filter((u) => u.id !== id);
    if (filtered.length === config.adUnits.length) {
      return NextResponse.json({ success: false, error: "Ad unit not found." }, { status: 404 });
    }

    await saveAdSenseSettings({ adUnits: filtered });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Ad unit DELETE error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
