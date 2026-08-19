import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectToDatabase } from "@/lib/mongodb";
import ConversionGoal from "@/models/conversion-goal";
import { requirePermission } from "@/lib/api-middleware";

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

    const permError = await requirePermission(jwtUser, "tracking:view");
    if (permError) return permError;

    await connectToDatabase();

    const goals = await ConversionGoal.find().sort({ category: 1, name: 1 }).lean();

    return NextResponse.json({ success: true, data: goals });
  } catch (error) {
    console.error("Conversion goals GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
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

    const body = await request.json();
    await connectToDatabase();

    // Validate required fields
    if (!body.name || !body.eventName) {
      return NextResponse.json({ success: false, error: "Name and Event Name are required" }, { status: 400 });
    }

    const goal = await ConversionGoal.create(body);

    return NextResponse.json({ success: true, data: goal });
  } catch (error) {
    console.error("Conversion goal POST error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}