import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import Role from "@/models/role";
import { auth } from "@/lib/auth";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function PUT(request: Request, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    const role = (session.user as { role?: string }).role;
    if (role !== "super-admin") {
      return NextResponse.json({ success: false, error: "Only super-admin can edit roles" }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    await connectToDatabase();

    const roleDoc = await Role.findById(id);
    if (!roleDoc) {
      return NextResponse.json({ success: false, error: "Role not found" }, { status: 404 });
    }

    if (roleDoc.isSystem && roleDoc.slug === "super-admin") {
      return NextResponse.json({ success: false, error: "Cannot modify the super-admin role" }, { status: 400 });
    }

    if (body.name) roleDoc.name = body.name;
    if (body.description !== undefined) roleDoc.description = body.description;
    if (body.permissions) roleDoc.permissions = body.permissions;

    await roleDoc.save();
    return NextResponse.json({ success: true, data: roleDoc });
  } catch (error) {
    console.error("Role PUT error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    const role = (session.user as { role?: string }).role;
    if (role !== "super-admin") {
      return NextResponse.json({ success: false, error: "Only super-admin can delete roles" }, { status: 403 });
    }

    const { id } = await params;
    await connectToDatabase();

    const roleDoc = await Role.findById(id);
    if (!roleDoc) {
      return NextResponse.json({ success: false, error: "Role not found" }, { status: 404 });
    }

    if (roleDoc.isSystem) {
      return NextResponse.json({ success: false, error: "Cannot delete system roles" }, { status: 400 });
    }

    await Role.findByIdAndDelete(id);
    return NextResponse.json({ success: true, message: "Role deleted" });
  } catch (error) {
    console.error("Role DELETE error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
