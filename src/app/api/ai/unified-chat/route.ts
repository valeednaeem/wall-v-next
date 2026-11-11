import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { processRequest } from "@/lib/unified-request-processor";
import Project from "@/models/project";
import Client from "@/models/client";
import connectToDatabase from "@/lib/mongodb";

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser();
    const body = await request.json();
    const { message, conversationId, channel, page } = body;

    if (!message || typeof message !== "string" || message.trim().length === 0) {
      return NextResponse.json({ error: "Message is required" }, { status: 400 });
    }

    const result = await processRequest({
      message: message.trim(),
      context: {
        userId: user?.userId,
        userRole: user?.role,
        visitorId: user?.userId || `visitor-${Date.now()}`,
        visitorName: user?.email?.split("@")[0] || "Visitor",
        visitorEmail: user?.email || "",
        channel: (channel as "chat" | "voice" | "website" | "dashboard") || "chat",
        conversationId,
        page,
      },
    });

    let projectCreated = false;
    let projectId = null;

    const projectMarker = "_project_create:";
    if (result.response.includes(projectMarker)) {
      const parts = result.response.split(projectMarker);
      result.response = parts[0].trim();
      try {
        const projectData = JSON.parse(parts[1]);
        await connectToDatabase();

        let client = null;
        if (user?.userId) {
          client = await Client.findOne({ userId: user.userId });
        }
        if (!client && user?.email) {
          client = await Client.findOne({ email: user.email });
        }

        if (!client && user?.email) {
          client = await Client.create({
            name: user.email.split("@")[0],
            email: user.email,
            type: "individual",
            status: "active",
            source: "chat",
            tags: ["ai-created", "chat"],
          });
        }

        if (client) {
          const slug = `${projectData.projectType.toLowerCase().replace(/\s+/g, "-")}-${Date.now()}`;
          const project = await Project.create({
            name: `${projectData.projectType} - ${client.name}`,
            slug,
            title: `${projectData.projectType} Project`,
            description: projectData.objective,
            client: {
              name: client.name,
              email: client.email,
              phone: client.phone || "",
              company: client.company || "",
            },
            status: "planning",
            priority: "medium",
            budget: 0,
            progress: 0,
            milestones: [
              { name: "Discovery & Planning", status: "in-progress" },
              { name: "Design", status: "pending" },
              { name: "Development", status: "pending" },
              { name: "Testing", status: "pending" },
              { name: "Launch", status: "pending" },
            ],
            requirements: {
              projectType: projectData.projectType,
              objective: projectData.objective,
              features: projectData.features,
              budget: projectData.budget,
              timeline: projectData.timeline,
              targetAudience: projectData.targetAudience,
            },
            tags: ["ai-created", "chat", projectData.projectType],
            notes: "Created via AI chat requirement gathering.",
          });

          client.totalProjects = (client.totalProjects || 0) + 1;
          client.lastContact = new Date();
          await client.save();

          projectCreated = true;
          projectId = project._id.toString();

          result.response = `Your project has been created! You can track its progress in your dashboard.\n\n**Project:** ${project.name}\n**Status:** Planning\n\nOur team will review the requirements and get started soon.`;
        }
      } catch { /* project creation failed, continue without it */ }
    }

    return NextResponse.json({
      success: result.success,
      response: result.response,
      classified: result.classified,
      capability: result.capability ? {
        id: result.capability.id,
        name: result.capability.name,
        category: result.capability.category,
      } : null,
      agent: result.agent ? {
        name: result.agent.name,
        role: result.agent.role,
        avatar: result.agent.avatar,
      } : null,
      conversationId: result.conversationId,
      projectCreated,
      projectId,
      requiresConfirmation: result.requiresConfirmation,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Chat failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
