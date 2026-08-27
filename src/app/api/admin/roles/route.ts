import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import Role from "@/models/role";
import { auth } from "@/lib/auth";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    const role = (session.user as { role?: string }).role;
    if (!["super-admin", "admin"].includes(role || "")) {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }

    await connectToDatabase();
    const roles = await Role.find({}).sort({ name: 1 }).lean();
    return NextResponse.json({ success: true, data: roles });
  } catch (error) {
    console.error("Roles GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    const role = (session.user as { role?: string }).role;
    if (role !== "super-admin") {
      return NextResponse.json({ success: false, error: "Only super-admin can create roles" }, { status: 403 });
    }

    const body = await request.json();
    const { name, slug, description, permissions } = body;

    if (!name || !slug) {
      return NextResponse.json({ success: false, error: "Name and slug are required" }, { status: 400 });
    }

    await connectToDatabase();

    const existing = await Role.findOne({ slug });
    if (existing) {
      return NextResponse.json({ success: false, error: "A role with this slug already exists" }, { status: 409 });
    }

    const roleDoc = await Role.create({
      name,
      slug,
      description: description || "",
      permissions: permissions || [],
      isSystem: false,
    });

    return NextResponse.json({ success: true, data: roleDoc });
  } catch (error) {
    console.error("Roles POST error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
