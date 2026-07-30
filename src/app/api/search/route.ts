import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import Product from "@/models/product";
import BlogPost from "@/models/blog-post";
import { escapeRegex } from "@/lib/escape-regex";

export async function GET(request: Request) {
  try {
    await connectToDatabase();
    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q");

    if (!q || q.length < 2) {
      return NextResponse.json({ success: true, data: { products: [], posts: [] } });
    }

    const searchRegex = { $regex: escapeRegex(q), $options: "i" };

    const [products, posts] = await Promise.all([
      Product.find({
        status: "published",
        $or: [{ name: searchRegex }, { description: searchRegex }],
      })
        .select("name slug type price featuredImage")
        .limit(5)
        .lean(),
      BlogPost.find({
        status: "published",
        $or: [{ title: searchRegex }, { excerpt: searchRegex }],
      })
        .select("title slug featuredImage excerpt publishedAt")
        .limit(5)
        .lean(),
    ]);

    return NextResponse.json({
      success: true,
      data: { products, posts },
    });
  } catch (error) {
    console.error("Search error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
