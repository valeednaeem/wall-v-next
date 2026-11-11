import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import BlogPost from "@/models/blog-post";

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
