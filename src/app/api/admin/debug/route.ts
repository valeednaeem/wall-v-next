import { NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongodb";
import Project from "@/models/project";
import Client from "@/models/client";
import User from "@/models/user";
import Agent from "@/models/agent";
import Invoice from "@/models/invoice";
import AgentConversation from "@/models/agent-conversation";
import ProjectRequest from "@/models/project-request";
import { getAuthUser } from "@/lib/auth";

export async function GET() {
  try {
    const user = await getAuthUser();
    if (!user || !["super-admin", "admin"].includes(user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectToDatabase();

    const [
      projectCount,
      clientCount,
      userCount,
      agentCount,
      invoiceCount,
      conversationCount,
      projectRequestCount,
      recentProjects,
      activeAgents,
      recentConversations,
    ] = await Promise.all([
      Project.countDocuments(),
      Client.countDocuments(),
      User.countDocuments(),
      Agent.countDocuments(),
      Invoice.countDocuments(),
      AgentConversation.countDocuments(),
      ProjectRequest.countDocuments(),
      Project.find()
        .sort({ createdAt: -1 })
        .limit(5)
        .select("name status projectType lifecycleStatus budget client clientRef createdAt")
        .lean(),
      Agent.find({ status: "active" })
        .select("name slug role stats")
        .limit(10)
        .lean(),
      AgentConversation.find()
        .sort({ createdAt: -1 })
        .limit(5)
        .select("sessionId channel status outcome messageCount createdAt")
        .lean(),
    ]);

    return NextResponse.json({
      counts: {
        projects: projectCount,
        clients: clientCount,
        users: userCount,
        agents: agentCount,
        invoices: invoiceCount,
        conversations: conversationCount,
        projectRequests: projectRequestCount,
      },
      recentProjects,
      activeAgents,
      recentConversations,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch debug info", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
