import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { verifyAdSenseIntegration } from "@/lib/adsense";

const ALLOWED_ROLES = ["super-admin", "admin", "manager"];

export async function POST() {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ success: false, error: "UNAUTHORIZED", message: "Your session has expired. Please sign in again." }, { status: 401 });
    }
    if (!ALLOWED_ROLES.includes(session.user.role)) {
      return NextResponse.json({ success: false, error: "FORBIDDEN", message: "You do not have permission to verify AdSense integration." }, { status: 403 });
    }

    const result = await verifyAdSenseIntegration();

    return NextResponse.json({
      success: true,
      data: {
        checks: result.checks,
        allPassed: result.valid,
        status: result.checks.every((c) => c.passed) ? "configured" : "error",
        lastVerified: new Date().toISOString(),
        issues: result.checks.filter((c) => !c.passed).map((c) => c.message),
      },
    });
  } catch (error) {
    console.error("AdSense verify POST error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
