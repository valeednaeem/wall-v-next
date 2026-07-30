import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import BlogPost from "@/models/blog-post";
import BlogCategory from "@/models/blog-category";
import { generateSlug } from "@/lib/generate-slug";
import { getAuthUser } from "@/lib/auth";
import { pickFields } from "@/lib/pick-fields";
import { escapeRegex } from "@/lib/escape-regex";

const BLOG_POST_FIELDS = ["title", "content", "excerpt", "featuredImage", "category", "tags", "status", "isFeatured", "seo"];

export async function GET(request: Request) {
  try {
    await connectToDatabase();
    const { searchParams } = new URL(request.url);

    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const category = searchParams.get("category");
    const tag = searchParams.get("tag");
    const search = searchParams.get("search");
    const featured = searchParams.get("featured");

    const query: Record<string, unknown> = { status: "published" };

    if (category) {
      const cat = await BlogCategory.findOne({ slug: category });
      if (cat) query.category = cat._id;
    }
    if (tag) query.tags = tag;
    if (featured === "true") query.isFeatured = true;
    if (search) {
      const safeSearch = escapeRegex(search);
      query.$or = [
        { title: { $regex: safeSearch, $options: "i" } },
        { excerpt: { $regex: safeSearch, $options: "i" } },
      ];
    }

    const total = await BlogPost.countDocuments(query);
    const posts = await BlogPost.find(query)
      .populate("author", "name avatar")
      .populate("category", "name slug")
      .populate("tags", "name slug")
      .sort({ publishedAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    return NextResponse.json({
      success: true,
      data: posts,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error("Blog GET error:", error);
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

    const slug = generateSlug(body.title);
    const existing = await BlogPost.findOne({ slug });
    if (existing) {
      return NextResponse.json({ error: "Post with this title already exists" }, { status: 409 });
    }

    const postData = pickFields(body, BLOG_POST_FIELDS);
    const readTime = Math.ceil((body.content || "").split(/\s+/).length / 200);
    const post = await BlogPost.create({ ...postData, slug, readTime });

    return NextResponse.json({ success: true, data: post }, { status: 201 });
  } catch (error) {
    console.error("Blog POST error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
