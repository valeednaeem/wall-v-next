import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import ProductCategory from "@/models/product-category";
import { generateSlug } from "@/lib/generate-slug";

export async function GET(request: Request) {
  try {
    await connectToDatabase();
    const { searchParams } = new URL(request.url);
    const parent = searchParams.get("parent");
    const includeCount = searchParams.get("includeCount") === "true";

    const query: Record<string, unknown> = { isActive: true };
    if (parent) {
      const parentCat = await ProductCategory.findOne({ slug: parent });
      if (parentCat) query.parent = parentCat._id;
    } else {
      query.parent = { $exists: false };
    }

    let categories = await ProductCategory.find(query)
      .sort({ sortOrder: 1 })
      .lean();

    if (includeCount) {
      const Product = (await import("@/models/product")).default;
      for (const cat of categories) {
        const count = await Product.countDocuments({ category: cat._id, status: "published" });
        (cat as any).productCount = count;
      }
    }

    return NextResponse.json({ success: true, data: categories });
  } catch (error) {
    console.error("Categories GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    await connectToDatabase();
    const body = await request.json();

    const slug = generateSlug(body.name);
    const existing = await ProductCategory.findOne({ slug });
    if (existing) {
      return NextResponse.json({ error: "Category with this name already exists" }, { status: 409 });
    }

    const category = await ProductCategory.create({ ...body, slug });
    return NextResponse.json({ success: true, data: category }, { status: 201 });
  } catch (error) {
    console.error("Categories POST error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
