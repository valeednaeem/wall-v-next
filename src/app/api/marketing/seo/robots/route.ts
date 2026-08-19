import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectToDatabase } from "@/lib/mongodb";
import RobotsSettings from "@/models/robots-settings";
import { requirePermission } from "@/lib/api-middleware";

const SYSTEM_PROTECTED_DISALLOW = [
  "/dashboard",
  "/api",
  "/portal",
  "/customer",
  "/admin",
  "/orders",
  "/projects",
  "/private",
  "/preview",
  "/login",
  "/register",
  "/password-reset",
];

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ success: false, error: "UNAUTHORIZED", message: "Your session has expired. Please sign in again." }, { status: 401 });
    }

    // Convert NextAuth user to JWTPayload for permission check
    const jwtUser = {
      userId: session.user.id,
      email: session.user.email || null,
      role: (session.user as { role?: string }).role || "customer",
      permissions: (session.user as { permissions?: string[] }).permissions || [],
    };

    const permError = await requirePermission(jwtUser, "seo:view");
    if (permError) return permError;

    await connectToDatabase();
    let settings = await RobotsSettings.findOne().lean();
    if (!settings) {
      settings = await RobotsSettings.create({
        defaultDirectives: [{ userAgent: "*", allow: ["/"], disallow: SYSTEM_PROTECTED_DISALLOW }],
      });
    }

    // Ensure system-protected routes are always in disallow
    if (settings.defaultDirectives?.[0]) {
      const sysDisallow = settings.defaultDirectives[0].disallow || [];
      for (const path of SYSTEM_PROTECTED_DISALLOW) {
        if (!sysDisallow.includes(path)) {
          sysDisallow.push(path);
        }
      }
      settings.defaultDirectives[0].disallow = sysDisallow;
    }

    return NextResponse.json({ success: true, data: settings });
  } catch (error) {
    console.error("Robots settings GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ success: false, error: "UNAUTHORIZED", message: "Your session has expired. Please sign in again." }, { status: 401 });
    }

    // Convert NextAuth user to JWTPayload for permission check
    const jwtUser = {
      userId: session.user.id,
      email: session.user.email || null,
      role: (session.user as { role?: string }).role || "customer",
      permissions: (session.user as { permissions?: string[] }).permissions || [],
    };

    const permError = await requirePermission(jwtUser, "seo:robots:manage");
    if (permError) return permError;

    const body = await request.json();
    await connectToDatabase();

    // Ensure system-protected routes are always in the first directive's disallow
    let defaultDirectives = body.defaultDirectives || [{ userAgent: "*", allow: ["/"], disallow: [] }];
    if (defaultDirectives[0]) {
      const sysDisallow = defaultDirectives[0].disallow || [];
      for (const path of SYSTEM_PROTECTED_DISALLOW) {
        if (!sysDisallow.includes(path)) {
          sysDisallow.push(path);
        }
      }
      defaultDirectives[0].disallow = sysDisallow;
    }

    const updateData = {
      defaultDirectives,
      additionalAllowed: body.additionalAllowed || [],
      additionalBlocked: body.additionalBlocked || [],
      sitemapUrl: body.sitemapUrl || "",
      hostDirective: body.hostDirective || "",
      crawlDelay: body.crawlDelay,
    };

    let settings = await RobotsSettings.findOne();
    if (!settings) {
      settings = await RobotsSettings.create(updateData);
    } else {
      settings = await RobotsSettings.findByIdAndUpdate(settings._id, updateData, { new: true });
    }

    return NextResponse.json({ success: true, data: settings });
  } catch (error) {
    console.error("Robots settings PUT error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}