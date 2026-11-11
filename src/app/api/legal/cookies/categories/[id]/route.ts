import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import CookieCategory from "@/models/cookie-category";
import { auth } from "@/lib/auth";
import { pickFields } from "@/lib/pick-fields";

const CATEGORY_FIELDS = ["name", "description", "isRequired", "defaultEnabled", "sortOrder", "isActive"];

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
    const categoryData = pickFields(body, CATEGORY_FIELDS);

    const updated = await CookieCategory.findByIdAndUpdate(id, categoryData, { new: true });
    if (!updated) {
      return NextResponse.json({ error: "Category not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    console.error("Cookie category PUT error:", error);
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
    await CookieCategory.findByIdAndDelete(id);

    return NextResponse.json({ success: true, message: "Category deleted" });
  } catch (error) {
    console.error("Cookie category DELETE error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
