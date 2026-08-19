import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import GoogleServiceConfig from "@/models/google-services";
import { auth } from "@/lib/auth";
import { requirePermission } from "@/lib/api-middleware";

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

    const permError = await requirePermission(jwtUser, "google:analytics:view");
    if (permError) return permError;

    const { serviceId } = await params;
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

    const permError = await requirePermission(jwtUser, "google:analytics:manage");
    if (permError) return permError;

    const { serviceId } = await params;
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