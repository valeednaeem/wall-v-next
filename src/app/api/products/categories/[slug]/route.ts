import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import ProductCategory from "@/models/product-category";
import { getAuthUser } from "@/lib/auth";
import { logError } from "@/lib/error-logger";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    await connectToDatabase();
    const { slug } = await params;

    const category = await ProductCategory.findOne({ slug, isActive: true }).lean();
    if (!category) {
      return NextResponse.json({ error: "Category not found" }, { status: 404 });
    }

    const children = await ProductCategory.find({ parent: category._id, isActive: true })
      .sort({ sortOrder: 1 })
      .lean();

    return NextResponse.json({ success: true, data: { ...category, children } });
  } catch (error) {
    await logError({
      level: "error",
      message: "Error fetching category",
      source: "api/products/categories/[slug]",
      stack: error instanceof Error ? error.stack : undefined,
    });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  let user;
  try {
    user = await getAuthUser();
    if (!user || !["super-admin", "admin", "manager"].includes(user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await connectToDatabase();
    const { slug } = await params;
    const body = await request.json();

    const category = await ProductCategory.findOneAndUpdate({ slug }, body, { new: true });
    if (!category) {
      return NextResponse.json({ error: "Category not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: category });
  } catch (error) {
    await logError({
      level: "error",
      message: "Error updating category",
      source: "api/products/categories/[slug]",
      stack: error instanceof Error ? error.stack : undefined,
      metadata: { userId: user?.userId },
    });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  let user;
  try {
    user = await getAuthUser();
    if (!user || !["super-admin", "admin", "manager"].includes(user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await connectToDatabase();
    const { slug } = await params;

    const category = await ProductCategory.findOneAndDelete({ slug });
    if (!category) {
      return NextResponse.json({ error: "Category not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: "Category deleted" });
  } catch (error) {
    await logError({
      level: "error",
      message: "Error deleting category",
      source: "api/products/categories/[slug]",
      stack: error instanceof Error ? error.stack : undefined,
      metadata: { userId: user?.userId },
    });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
