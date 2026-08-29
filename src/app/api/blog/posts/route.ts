import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import BlogPost from "@/models/blog-post";
import BlogCategory from "@/models/blog-category";
import BlogTag from "@/models/blog-tag";
import { generateSlug } from "@/lib/generate-slug";
import { getAuthUser } from "@/lib/auth";
import { pickFields } from "@/lib/pick-fields";
import { escapeRegex } from "@/lib/escape-regex";

const BLOG_POST_FIELDS = ["title", "content", "excerpt", "featuredImage", "category", "tags", "status", "isFeatured", "seo", "social"];

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
    const status = searchParams.get("status");
    const allStatuses = searchParams.get("allStatuses") === "true";

    const query: Record<string, unknown> = {};

    if (allStatuses) {
      if (status) query.status = status;
    } else {
      query.status = "published";
    }

    if (category) {
      const cat = await BlogCategory.findOne({ slug: category });
      if (cat) query.category = cat._id;
    }
    if (tag) {
      const tagDoc = await BlogTag.findOne({ slug: tag });
      if (tagDoc) query.tags = { $in: [tagDoc._id] };
    }
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
      .sort({ publishedAt: -1, createdAt: -1 })
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

    if (!body.title || !body.content) {
      return NextResponse.json({ error: "Title and content are required" }, { status: 400 });
    }

    const slug = generateSlug(body.title);
    const existing = await BlogPost.findOne({ slug });
    if (existing) {
      return NextResponse.json({ error: "Post with this title already exists" }, { status: 409 });
    }

    const postData = pickFields(body, BLOG_POST_FIELDS);
    const readTime = Math.ceil((body.content || "").split(/\s+/).filter(Boolean).length / 200);

    let categoryObjId = undefined;
    if (body.category) {
      categoryObjId = body.category;
    }

    let tagObjIds: string[] = [];
    if (body.tags && Array.isArray(body.tags)) {
      for (const tagName of body.tags) {
        if (!tagName || typeof tagName !== "string") continue;
        const tagSlug = tagName.toLowerCase().replace(/[^\w\s-]/g, "").replace(/\s+/g, "-").trim();
        let tagDoc = await BlogTag.findOne({ slug: tagSlug });
        if (!tagDoc) {
          tagDoc = await BlogTag.create({ name: tagName.trim(), slug: tagSlug });
        }
        tagObjIds.push(tagDoc._id.toString());
      }
    }

    const post = await BlogPost.create({
      ...postData,
      slug,
      readTime,
      author: user.userId,
      createdBy: user.userId,
      category: categoryObjId || undefined,
      tags: tagObjIds,
      publishedAt: body.status === "published" ? new Date() : undefined,
    });

    return NextResponse.json({ success: true, data: post }, { status: 201 });
  } catch (error) {
    console.error("Blog POST error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
