import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import BlogCategory from "@/models/blog-category";

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
