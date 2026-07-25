import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import User from "@/models/user";
import Product from "@/models/product";
import BlogPost from "@/models/blog-post";
import Inquiry from "@/models/inquiry";

export async function GET(request: Request) {
  try {
    const cookieHeader = request.headers.get("cookie") || "";
    const hasSession = cookieHeader.includes("next-auth.session-token")
      || cookieHeader.includes("__Secure-next-auth-session-token")
      || cookieHeader.includes("token=");

    if (!hasSession) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectToDatabase();

    const [totalUsers, totalProducts, totalPosts, totalInquiries, recentInquiries] =
      await Promise.all([
        User.countDocuments(),
        Product.countDocuments({ status: "published" }),
        BlogPost.countDocuments({ status: "published" }),
        Inquiry.countDocuments(),
        Inquiry.find().sort({ createdAt: -1 }).limit(5).lean(),
      ]);

    return NextResponse.json({
      success: true,
      data: {
        totalUsers,
        totalProducts,
        totalPosts,
        totalInquiries,
        recentInquiries,
      },
    });
  } catch (error) {
    console.error("Dashboard stats error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
