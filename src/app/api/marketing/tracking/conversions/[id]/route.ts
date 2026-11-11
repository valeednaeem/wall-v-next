import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectToDatabase } from "@/lib/mongodb";
import ConversionGoal from "@/models/conversion-goal";
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

    const { _id, createdAt, updatedAt, ...updateData } = body;

    const goal = await ConversionGoal.findByIdAndUpdate(id, updateData, { new: true });

    if (!goal) {
      return NextResponse.json({ success: false, error: "Conversion goal not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: goal });
  } catch (error) {
    console.error("Conversion goal PUT error:", error);
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

    const goal = await ConversionGoal.findByIdAndDelete(id);

    if (!goal) {
      return NextResponse.json({ success: false, error: "Conversion goal not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Conversion goal DELETE error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}