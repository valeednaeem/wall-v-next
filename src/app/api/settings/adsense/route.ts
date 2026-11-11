import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getAdSenseSettings, saveAdSenseSettings, getAdSenseStatus } from "@/lib/adsense";

const ALLOWED_ROLES = ["super-admin", "admin", "manager"];

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ success: false, error: "UNAUTHORIZED", message: "Your session has expired. Please sign in again." }, { status: 401 });
    }
    if (!ALLOWED_ROLES.includes(session.user.role)) {
      return NextResponse.json({ success: false, error: "FORBIDDEN", message: "You do not have permission to manage AdSense settings." }, { status: 403 });
    }

    const [settings, status] = await Promise.all([getAdSenseSettings(), getAdSenseStatus()]);

    return NextResponse.json({ success: true, data: { ...settings, statusInfo: status } });
  } catch (error) {
    console.error("AdSense settings GET error:", error);
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
      return NextResponse.json({ success: false, error: "FORBIDDEN", message: "You do not have permission to manage AdSense settings." }, { status: 403 });
    }

    const body = await request.json();
    const updated = await saveAdSenseSettings(body);

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    console.error("AdSense settings PUT error:", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    const status = message.includes("Invalid") || message.includes("required") ? 400 : 500;
    return NextResponse.json({ success: false, error: message }, { status });
  }
}
