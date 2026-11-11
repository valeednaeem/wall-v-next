import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import GoogleServiceConfig from "@/models/google-services";
import { auth } from "@/lib/auth";
import { requirePermission } from "@/lib/api-middleware";

function getManagePermission(serviceId: string): string {
  switch (serviceId) {
    case "analytics":
      return "google:analytics:manage";
    case "search_console":
      return "google:search_console:manage";
    case "business_profile":
      return "google:business_profile:manage";
    case "merchant_center":
      return "google:merchant:manage";
    case "ads":
      return "google:ads:manage";
    default:
      return "marketing:manage";
  }
}

function getViewPermission(serviceId: string): string {
  switch (serviceId) {
    case "analytics":
      return "google:analytics:view";
    case "search_console":
      return "google:search_console:view";
    case "business_profile":
      return "google:business_profile:view";
    case "merchant_center":
      return "google:merchant:view";
    case "ads":
      return "google:ads:view";
    default:
      return "marketing:view";
  }
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ serviceId: string }> }
) {
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

    const { serviceId } = await params;
    const permError = await requirePermission(jwtUser, getViewPermission(serviceId));
    if (permError) return permError;

    await connectToDatabase();

    const service = await GoogleServiceConfig.findOne({ serviceId }).lean();
    if (!service) {
      return NextResponse.json({ success: false, error: "Service not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: service });
  } catch (error) {
    console.error("Service GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ serviceId: string }> }
) {
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

    const { serviceId } = await params;
    const permError = await requirePermission(jwtUser, getManagePermission(serviceId));
    if (permError) return permError;

    const body = await request.json();
    await connectToDatabase();

    const service = await GoogleServiceConfig.findOneAndUpdate(
      { serviceId },
      {
        $set: {
          config: body,
          enabled: true,
          status: "config_required",
        },
      },
      { new: true, upsert: true }
    );

    return NextResponse.json({ success: true, data: service });
  } catch (error) {
    console.error("Service PUT error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}