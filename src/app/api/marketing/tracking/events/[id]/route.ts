import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectToDatabase } from "@/lib/mongodb";
import TrackingEvent from "@/models/tracking-event";
import { requirePermission } from "@/lib/api-middleware";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
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

    const permError = await requirePermission(jwtUser, "tracking:manage");
    if (permError) return permError;

    const { id } = await params;
    const body = await request.json();
    await connectToDatabase();

    // Prevent modifying system events
    const existing = await TrackingEvent.findById(id);
    if (!existing) {
      return NextResponse.json({ success: false, error: "Event not found" }, { status: 404 });
    }
    if (existing.isSystem) {
      // Allow only certain fields for system events
      const allowedSystemFields = ["googleAdsConversionId", "metaPixelId", "ga4EventName", "isActive"];
      const updateData: Record<string, unknown> = {};
      for (const field of allowedSystemFields) {
        if (body[field] !== undefined) {
          updateData[field] = body[field];
        }
      }
      if (Object.keys(updateData).length === 0) {
        return NextResponse.json({ success: false, error: "No allowed fields to update for system events" }, { status: 400 });
      }
      await TrackingEvent.findByIdAndUpdate(id, updateData);
      return NextResponse.json({ success: true });
    }

    // For custom events, allow all fields except isSystem and eventName
    const { eventName, isSystem, ...updateData } = body;
    await TrackingEvent.findByIdAndUpdate(id, updateData);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Tracking event PUT error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
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

    const permError = await requirePermission(jwtUser, "tracking:manage");
    if (permError) return permError;

    const { id } = await params;
    await connectToDatabase();

    const event = await TrackingEvent.findById(id);
    if (!event) {
      return NextResponse.json({ success: false, error: "Event not found" }, { status: 404 });
    }
    if (event.isSystem) {
      return NextResponse.json({ success: false, error: "Cannot delete system events" }, { status: 400 });
    }

    await TrackingEvent.findByIdAndDelete(id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Tracking event DELETE error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}