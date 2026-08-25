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

    await connectToDatabase();

    // Customer/Client role: return their own data only
    const customerRoles = ["customer", "CLIENT", "client"];
    if (customerRoles.includes(user.role)) {
      const client = await Client.findOne({ email: user.email }).lean();
      const clientFilter = client ? { "client.email": user.email } : { "client.email": user.email };

      const [myProjects, myActiveProjects, myCompletedProjects] = await Promise.all([
        Project.countDocuments(clientFilter),
        Project.countDocuments({ ...clientFilter, status: { $in: ["in-progress", "review", "testing", "new", "planning"] } }),
        Project.countDocuments({ ...clientFilter, status: "completed" }),
      ]);

      const recentProjects = await Project.find(clientFilter)
        .sort({ createdAt: -1 })
        .limit(5)
        .select("name status projectType progress budget currency createdAt")
        .lean();

      return NextResponse.json({
        success: true,
        data: {
          totalProjects: myProjects,
          activeProjects: myActiveProjects,
          completedProjects: myCompletedProjects,
          recentProjects,
          role: "customer",
        },
      });
    }

    // Admin/manager/staff: require analytics:view permission
    const permissionError = await requirePermission(user, "analytics:view");
    if (permissionError) {
      return permissionError;
    }

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
      projectsByLifecycleStatus,
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
        Project.aggregate([
          { $group: { _id: "$lifecycleStatus", count: { $sum: 1 } } },
        ]).then((results) => {
          const map: Record<string, number> = {};
          for (const r of results) {
            map[r._id || "other"] = r.count;
          }
          return map;
        }),
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
        projectsByLifecycleStatus,
      },
    });
  } catch (error) {
    console.error("Dashboard stats error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
