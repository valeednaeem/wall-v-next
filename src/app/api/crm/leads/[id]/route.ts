import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import Lead from "@/models/lead";
import { getAuthUser } from "@/lib/auth";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getAuthUser();
    if (!user || !["super-admin", "admin", "manager", "staff"].includes(user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const { id } = await params;
    await connectToDatabase();
    const lead = await Lead.findById(id).lean();
    if (!lead) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ success: true, data: lead });
  } catch (error) {
    console.error("Lead GET error:", error);
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
    const allowed = ["name", "email", "phone", "company", "source", "status", "score", "requirements", "serviceInterest", "notes"];
    const updates: Record<string, unknown> = {};
    for (const key of allowed) {
      if (body[key] !== undefined) updates[key] = body[key];
    }
    const lead = await Lead.findByIdAndUpdate(id, updates, { new: true }).lean();
    if (!lead) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ success: true, data: lead });
  } catch (error) {
    console.error("Lead PUT error:", error);
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
    const lead = await Lead.findByIdAndDelete(id).lean();
    if (!lead) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ success: true, message: "Lead deleted" });
  } catch (error) {
    console.error("Lead DELETE error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
