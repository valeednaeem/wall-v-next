import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import BlogPost from "@/models/blog-post";
import { getAuthUser } from "@/lib/auth";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const user = await getAuthUser();
    if (!user || !["super-admin", "admin"].includes(user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await connectToDatabase();
    const { slug } = await params;
    const body = await request.json().catch(() => ({}));

    const post = await BlogPost.findOne({ slug });
    if (!post) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    if (post.status !== "review") {
      return NextResponse.json(
        { error: "Only posts in review status can be rejected" },
        { status: 400 }
      );
    }

    post.status = "draft";
    if (body.reason) {
      post.revisions.push({
        content: `[Rejection reason: ${body.reason}]`,
        revisedAt: new Date(),
        revisedBy: user.userId,
      });
    }
    await post.save();

    return NextResponse.json({ success: true, data: post });
  } catch (error) {
    console.error("Blog post reject error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
