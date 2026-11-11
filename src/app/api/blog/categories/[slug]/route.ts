import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import BlogCategory from "@/models/blog-category";
import { getAuthUser } from "@/lib/auth";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    await connectToDatabase();
    const { slug } = await params;
    const category = await BlogCategory.findOne({ slug }).lean();
    if (!category) {
      return NextResponse.json({ error: "Category not found" }, { status: 404 });
    }
    return NextResponse.json({ success: true, data: category });
  } catch (error) {
    console.error("Blog category GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const user = await getAuthUser();
    if (!user || !["super-admin", "admin", "manager"].includes(user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await connectToDatabase();
    const { slug } = await params;
    const body = await request.json();

    const updateData: Record<string, unknown> = {};
    if (body.name) {
      updateData.name = body.name;
      updateData.slug = body.name.toLowerCase().replace(/[^\w\s-]/g, "").replace(/\s+/g, "-").replace(/--+/g, "-").trim();
    }
    if (body.description !== undefined) updateData.description = body.description;
    if (body.image !== undefined) updateData.image = body.image;
    if (body.sortOrder !== undefined) updateData.sortOrder = body.sortOrder;
    if (body.isActive !== undefined) updateData.isActive = body.isActive;

    const category = await BlogCategory.findOneAndUpdate({ slug }, updateData, { new: true });
    if (!category) {
      return NextResponse.json({ error: "Category not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: category });
  } catch (error) {
    console.error("Blog category PUT error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const user = await getAuthUser();
    if (!user || !["super-admin", "admin", "manager"].includes(user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await connectToDatabase();
    const { slug } = await params;
    const category = await BlogCategory.findOneAndDelete({ slug });
    if (!category) {
      return NextResponse.json({ error: "Category not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: "Category deleted" });
  } catch (error) {
    console.error("Blog category DELETE error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
