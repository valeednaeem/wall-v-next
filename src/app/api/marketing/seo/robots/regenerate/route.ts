import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectToDatabase } from "@/lib/mongodb";
import RobotsSettings from "@/models/robots-settings";
import { requirePermission } from "@/lib/api-middleware";

export async function POST() {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ success: false, error: "UNAUTHORIZED", message: "Your session has expired. Please sign in again." }, { status: 401 });
    }

    const jwtUser = {
      userId: session.user.id,
      email: session.user.email || null,
      role: (session.user as { role?: string }).role || "customer",
      permissions: (session.user as { permissions?: string[] }).permissions || [],
    };

    const permError = await requirePermission(jwtUser, "seo:robots:manage");
    if (permError) return permError;

    await connectToDatabase();

    // Ensure settings exist
    let settings = await RobotsSettings.findOne();
    if (!settings) {
      settings = await RobotsSettings.create({
        defaultDirectives: [{ userAgent: "*", allow: ["/"], disallow: ["/dashboard", "/api", "/portal", "/customer", "/admin", "/orders", "/projects", "/private", "/preview", "/login", "/register", "/password-reset"] }],
      });
    }

    return NextResponse.json({ success: true, message: "Robots.txt regenerated" });
  } catch (error) {
    console.error("Robots regenerate error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
