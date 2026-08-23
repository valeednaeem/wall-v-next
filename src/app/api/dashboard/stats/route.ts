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
import Agent from "@/models/agent";
import AgentConversation from "@/models/agent-conversation";
import AgentExecution from "@/models/agent-execution";
import ProjectRequest from "@/models/project-request";
import { getAuthUser } from "@/lib/auth";
import { requirePermission } from "@/lib/api-middleware";

export async function GET() {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json(
        { success: false, error: "UNAUTHORIZED", message: "Authentication required." },
        { status: 401 }
      );
    }
    const permissionError = await requirePermission(user, "analytics:view");
    if (permissionError) {
      return permissionError;
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
      totalAgents,
      activeAgents,
      totalAgentConversations,
      totalProjectRequests,
      pendingProjectRequests,
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
        Agent.countDocuments(),
        Agent.countDocuments({ status: "active" }),
        AgentConversation.countDocuments(),
        ProjectRequest.countDocuments(),
        ProjectRequest.countDocuments({ status: { $in: ["collecting", "requirements-gathered"] } }),
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
        totalAgents,
        activeAgents,
        totalAgentConversations,
        totalProjectRequests,
        pendingProjectRequests,
      },
    });
  } catch (error) {
    console.error("Dashboard stats error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
