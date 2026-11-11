import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import Client from "@/models/client";
import { getAuthUser } from "@/lib/auth";
import { CRM_ROLES, CONTENT_ROLES, ADMIN_ROLES } from "@/lib/api-middleware";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getAuthUser();
    if (!user || !CRM_ROLES.includes(user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const { id } = await params;
    await connectToDatabase();
    const client = await Client.findById(id).lean();
    if (!client) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ success: true, data: client });
  } catch (error) {
    console.error("Client GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getAuthUser();
    if (!user || !CONTENT_ROLES.includes(user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const { id } = await params;
    await connectToDatabase();
    const body = await request.json();
    const allowed = ["name", "email", "phone", "company", "type", "status", "notes", "assignedTo"];
    const updates: Record<string, unknown> = {};
    for (const key of allowed) {
      if (body[key] !== undefined) updates[key] = body[key];
    }
    const client = await Client.findByIdAndUpdate(id, updates, { new: true }).lean();
    if (!client) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ success: true, data: client });
  } catch (error) {
    console.error("Client PUT error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getAuthUser();
    if (!user || !ADMIN_ROLES.includes(user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const { id } = await params;
    await connectToDatabase();
    const client = await Client.findByIdAndDelete(id).lean();
    if (!client) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ success: true, message: "Client deleted" });
  } catch (error) {
    console.error("Client DELETE error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
