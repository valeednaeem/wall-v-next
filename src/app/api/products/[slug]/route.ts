import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import Product from "@/models/product";
import { getAuthUser } from "@/lib/auth";
import { pickFields } from "@/lib/pick-fields";

const PRODUCT_UPDATE_FIELDS = [
  "name", "type", "description", "shortDescription", "content",
  "featuredImage", "gallery", "price", "salePrice", "currency",
  "category", "subcategory", "badges", "features", "specifications",
  "status", "isFeatured", "isPromotional", "stock", "sku",
  "seo", "social", "variants",
];

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    await connectToDatabase();
    const { slug } = await params;
    const { searchParams } = new URL(request.url);
    const allStatuses = searchParams.get("allStatuses") === "true";

    const query: Record<string, unknown> = { slug };
    if (!allStatuses) query.status = "published";

    const product = await Product.findOne(query)
      .populate("category", "name slug")
      .lean();

    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    if (!allStatuses) {
      await Product.findByIdAndUpdate(product._id, { $inc: { viewCount: 1 } });
    }

    return NextResponse.json({ success: true, data: product });
  } catch (error) {
    console.error("Product GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const user = await getAuthUser();
    if (!user || !["super-admin", "admin", "manager", "staff"].includes(user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectToDatabase();
    const { slug } = await params;
    const body = await request.json();

    const productData = pickFields(body, PRODUCT_UPDATE_FIELDS);
    const product = await Product.findOneAndUpdate({ slug }, productData, { new: true });
    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: product });
  } catch (error) {
    console.error("Product PUT error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const user = await getAuthUser();
    if (!user || !["super-admin", "admin", "manager", "staff"].includes(user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectToDatabase();
    const { slug } = await params;

    const product = await Product.findOneAndDelete({ slug });
    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: "Product deleted" });
  } catch (error) {
    console.error("Product DELETE error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
