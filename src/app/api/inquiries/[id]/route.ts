import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import Inquiry from "@/models/inquiry";
import { getAuthUser } from "@/lib/auth";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getAuthUser();
    if (!user || !["super-admin", "admin", "manager", "staff"].includes(user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const { id } = await params;
    await connectToDatabase();
    const inquiry = await Inquiry.findById(id).lean();
    if (!inquiry) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ success: true, data: inquiry });
  } catch (error) {
    console.error("Inquiry GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getAuthUser();
    if (!user || !["super-admin", "admin", "manager"].includes(user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const { id } = await params;
    await connectToDatabase();
    const body = await request.json();
    const allowed = ["name", "email", "phone", "company", "subject", "message", "status", "priority", "type", "notes"];
    const updates: Record<string, unknown> = {};
    for (const key of allowed) {
      if (body[key] !== undefined) updates[key] = body[key];
    }
    const inquiry = await Inquiry.findByIdAndUpdate(id, updates, { new: true }).lean();
    if (!inquiry) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ success: true, data: inquiry });
  } catch (error) {
    console.error("Inquiry PUT error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getAuthUser();
    if (!user || !["super-admin", "admin"].includes(user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const { id } = await params;
    await connectToDatabase();
    const inquiry = await Inquiry.findByIdAndDelete(id).lean();
    if (!inquiry) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ success: true, message: "Inquiry deleted" });
  } catch (error) {
    console.error("Inquiry DELETE error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
