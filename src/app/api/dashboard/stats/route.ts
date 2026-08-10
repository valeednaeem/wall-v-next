import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import User from "@/models/user";
import Product from "@/models/product";
import BlogPost from "@/models/blog-post";
import Inquiry from "@/models/inquiry";
import Project from "@/models/project";
import Client from "@/models/client";
import Lead from "@/models/lead";
import Order from "@/models/order";
import { getAuthUser } from "@/lib/auth";

export async function GET() {
  try {
    const user = await getAuthUser();
    if (!user || !["super-admin", "admin", "manager"].includes(user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await connectToDatabase();

    const [
      totalUsers,
      totalProducts,
      totalPosts,
      totalInquiries,
      recentInquiries,
      totalProjects,
      activeProjects,
      completedProjects,
      totalClients,
      activeClients,
      totalLeads,
      qualifiedLeads,
      totalOrders,
      pendingOrders,
      totalRevenue,
    ] =
      await Promise.all([
        User.countDocuments(),
        Product.countDocuments({ status: "published" }),
        BlogPost.countDocuments({ status: "published" }),
        Inquiry.countDocuments(),
        Inquiry.find().sort({ createdAt: -1 }).limit(5).select("name email subject status createdAt").lean(),
        Project.countDocuments(),
        Project.countDocuments({ status: { $in: ["in-progress", "review", "testing"] } }),
        Project.countDocuments({ status: "completed" }),
        Client.countDocuments(),
        Client.countDocuments({ status: "active" }),
        Lead.countDocuments(),
        Lead.countDocuments({ status: { $in: ["qualified", "proposal", "negotiation"] } }),
        Order.countDocuments(),
        Order.countDocuments({ status: "pending" }),
        Order.aggregate([
          { $match: { paymentStatus: "paid" } },
          { $group: { _id: null, total: { $sum: "$total" } } },
        ]).then((result) => result[0]?.total || 0),
      ]);

    return NextResponse.json({
      success: true,
      data: {
        totalUsers,
        totalProducts,
        totalPosts,
        totalInquiries,
        recentInquiries,
        totalProjects,
        activeProjects,
        completedProjects,
        totalClients,
        activeClients,
        totalLeads,
        qualifiedLeads,
        totalOrders,
        pendingOrders,
        totalRevenue,
      },
    });
  } catch (error) {
    console.error("Dashboard stats error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
