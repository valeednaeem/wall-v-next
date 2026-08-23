import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import ProjectRequest from "@/models/project-request";
import Project from "@/models/project";
import Client from "@/models/client";
import connectToDatabase from "@/lib/mongodb";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    await connectToDatabase();
    const { id } = await params;
    const body = await request.json();
    const { projectManager, team, deadline } = body;

    const projectRequest = await ProjectRequest.findById(id);
    if (!projectRequest) {
      return NextResponse.json({ error: "Project request not found" }, { status: 404 });
    }

    if (projectRequest.status !== "approved" && projectRequest.status !== "requirements-gathered") {
      return NextResponse.json({ error: "Request must be approved first" }, { status: 400 });
    }

    // Create or find client
    let client = await Client.findOne({ email: projectRequest.client.email });
    if (!client) {
      client = await Client.create({
        name: projectRequest.client.name,
        email: projectRequest.client.email,
        phone: projectRequest.client.phone,
        company: projectRequest.client.company,
        type: projectRequest.client.company ? "business" : "individual",
        status: "active",
        source: "ai-agent",
      });
    }

    // Generate project name
    const projectName = `${projectRequest.requirements.projectType} - ${projectRequest.client.name}`;
    const slug = projectName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") + "-" + Date.now().toString(36);

    // Create project
    const project = await Project.create({
      name: projectName,
      slug,
      title: projectName,
      description: `${projectRequest.requirements.projectType} project for ${projectRequest.client.name}. ${projectRequest.requirements.objective}`,
      client: client._id,
      status: "planning",
      priority: projectRequest.requirements.budget?.max && projectRequest.requirements.budget.max > 10000 ? "high" : "medium",
      budget: projectRequest.requirements.budget?.max || 0,
      currency: projectRequest.requirements.budget?.currency || "USD",
      startDate: new Date(),
      deadline: deadline ? new Date(deadline) : undefined,
      progress: 0,
      team: team || [],
      projectManager: projectManager || undefined,
      requirements: {
        projectType: projectRequest.requirements.projectType,
        features: projectRequest.requirements.features,
        budget: `${projectRequest.requirements.budget?.min || 0}-${projectRequest.requirements.budget?.max || 0}`,
        timeline: projectRequest.requirements.timeline,
        designStyle: projectRequest.requirements.designStyle,
        industry: projectRequest.requirements.industry,
        targetAudience: projectRequest.requirements.targetAudience,
        integrations: projectRequest.requirements.integrations,
      },
      quote: projectRequest.quote ? {
        min: projectRequest.quote.min,
        max: projectRequest.quote.max,
        currency: projectRequest.quote.currency,
      } : undefined,
      tags: [
        projectRequest.requirements.projectType,
        "ai-generated",
        "master-agent",
      ],
    });

    // Update project request
    projectRequest.project = project._id;
    projectRequest.status = "project-created";
    await projectRequest.save();

    // Update client stats
    client.totalProjects = (client.totalProjects || 0) + 1;
    await client.save();

    return NextResponse.json({
      project,
      client,
      message: "Project created successfully from agent requirements",
    }, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to create project";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
