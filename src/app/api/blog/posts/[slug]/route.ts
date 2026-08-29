import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import BlogPost from "@/models/blog-post";
import BlogTag from "@/models/blog-tag";
import { getAuthUser } from "@/lib/auth";
import { pickFields } from "@/lib/pick-fields";

const BLOG_POST_FIELDS = ["title", "content", "excerpt", "featuredImage", "category", "tags", "status", "isFeatured", "seo", "social"];

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

    const post = await BlogPost.findOne(query)
      .populate("author", "name avatar")
      .populate("category", "name slug")
      .populate("tags", "name slug")
      .populate("relatedPosts", "title slug featuredImage excerpt")
      .lean();

    if (!post) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    if (!allStatuses) {
      await BlogPost.findByIdAndUpdate(post._id, { $inc: { viewCount: 1 } });
    }

    return NextResponse.json({ success: true, data: post });
  } catch (error) {
    console.error("Blog post GET error:", error);
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
    const postData = pickFields(body, BLOG_POST_FIELDS);

    if (body.content) {
      postData.readTime = Math.ceil(body.content.split(/\s+/).filter(Boolean).length / 200);
    }

    if (body.tags && Array.isArray(body.tags)) {
      const tagObjIds: string[] = [];
      for (const tagName of body.tags) {
        if (!tagName || typeof tagName !== "string") continue;
        const tagSlug = tagName.toLowerCase().replace(/[^\w\s-]/g, "").replace(/\s+/g, "-").trim();
        let tagDoc = await BlogTag.findOne({ slug: tagSlug });
        if (!tagDoc) {
          tagDoc = await BlogTag.create({ name: tagName.trim(), slug: tagSlug });
        }
        tagObjIds.push(tagDoc._id.toString());
      }
      postData.tags = tagObjIds;
    }

    if (body.status === "published") {
      const existing = await BlogPost.findOne({ slug }).lean();
      if (existing && existing.status !== "published") {
        postData.publishedAt = new Date();
      }
    }

    const post = await BlogPost.findOneAndUpdate({ slug }, postData, { new: true });
    if (!post) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: post });
  } catch (error) {
    console.error("Blog post PUT error:", error);
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

    const post = await BlogPost.findOneAndDelete({ slug });
    if (!post) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: "Post deleted" });
  } catch (error) {
    console.error("Blog post DELETE error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
