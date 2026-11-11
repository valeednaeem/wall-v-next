import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import CookieDefinition from "@/models/cookie-definition";
import { auth } from "@/lib/auth";
import { pickFields } from "@/lib/pick-fields";

const COOKIE_DEF_FIELDS = ["name", "description", "category", "duration", "type", "isRequired", "isActive", "purpose", "provider"];

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectToDatabase();
    const { id } = await params;
    const cookie = await CookieDefinition.findById(id).populate("category", "name slug").lean();
    if (!cookie) {
      return NextResponse.json({ error: "Cookie not found" }, { status: 404 });
    }
    return NextResponse.json({ success: true, data: cookie });
  } catch (error) {
    console.error("Cookie detail GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userRole = (session.user as { role?: string }).role;
    if (!["super-admin", "admin"].includes(userRole || "")) {
      return NextResponse.json({ error: "Forbidden: insufficient permissions" }, { status: 403 });
    }

    await connectToDatabase();
    const { id } = await params;
    const body = await request.json();
    const cookieData = pickFields(body, COOKIE_DEF_FIELDS);

    const updated = await CookieDefinition.findByIdAndUpdate(id, cookieData, { new: true });
    if (!updated) {
      return NextResponse.json({ error: "Cookie not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    console.error("Cookie PUT error:", error);
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
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userRole = (session.user as { role?: string }).role;
    if (!["super-admin", "admin"].includes(userRole || "")) {
      return NextResponse.json({ error: "Forbidden: insufficient permissions" }, { status: 403 });
    }

    await connectToDatabase();
    const { id } = await params;
    await CookieDefinition.findByIdAndDelete(id);

    return NextResponse.json({ success: true, message: "Cookie deleted" });
  } catch (error) {
    console.error("Cookie DELETE error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
