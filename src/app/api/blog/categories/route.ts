import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import BlogCategory from "@/models/blog-category";
import { getAuthUser } from "@/lib/auth";

export async function GET() {
  try {
    await connectToDatabase();
    const categories = await BlogCategory.find({}).sort({ name: 1 }).lean();
    return NextResponse.json({ success: true, data: categories });
  } catch (error) {
    console.error("Blog categories GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await getAuthUser();
    if (!user || !["super-admin", "admin", "manager"].includes(user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await connectToDatabase();
    const body = await request.json();

    const slug = body.name.toLowerCase().replace(/[^\w\s-]/g, "").replace(/\s+/g, "-").replace(/--+/g, "-").trim();
    const existing = await BlogCategory.findOne({ slug });
    if (existing) {
      return NextResponse.json({ error: "Category with this name already exists" }, { status: 409 });
    }

    const category = await BlogCategory.create({
      name: body.name,
      slug,
      description: body.description || "",
      image: body.image || "",
      sortOrder: body.sortOrder || 0,
      isActive: body.isActive ?? true,
    });

    return NextResponse.json({ success: true, data: category }, { status: 201 });
  } catch (error) {
    console.error("Blog categories POST error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
