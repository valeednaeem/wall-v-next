import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import BlogPost from "@/models/blog-post";
import { getAuthUser } from "@/lib/auth";
import { pickFields } from "@/lib/pick-fields";

const BLOG_POST_FIELDS = ["title", "content", "excerpt", "featuredImage", "category", "tags", "status", "isFeatured", "seo"];

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    await connectToDatabase();
    const { slug } = await params;

    const post = await BlogPost.findOne({ slug, status: "published" })
      .populate("author", "name avatar")
      .populate("category", "name slug")
      .populate("tags", "name slug")
      .populate("relatedPosts", "title slug featuredImage excerpt")
      .lean();

    if (!post) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    await BlogPost.findByIdAndUpdate(post._id, { $inc: { viewCount: 1 } });

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
