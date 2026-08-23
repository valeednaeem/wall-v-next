import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import ProjectRequest from "@/models/project-request";
import Project from "@/models/project";
import Client from "@/models/client";
import ProjectStage from "@/models/project-stage";
import Task from "@/models/task";
import ProjectRequirement from "@/models/project-requirement";
import connectToDatabase from "@/lib/mongodb";
import { generateStagesForProject } from "@/lib/stage-templates";
import { logProjectActivity } from "@/lib/activity-logger";

const PROJECT_TYPE_MAP: Record<string, string> = {
  website: "web-development",
  "web-app": "web-development",
  "web application": "web-development",
  "mobile-app": "mobile-app",
  "mobile app": "mobile-app",
  ecommerce: "e-commerce",
  "e-commerce": "e-commerce",
  "online store": "e-commerce",
  "graphic-design": "graphic-design",
  "graphic design": "graphic-design",
  "logo-design": "logo-design",
  "logo design": "logo-design",
  seo: "seo",
  "social-media": "social-media",
  "social media": "social-media",
  video: "video",
  consultancy: "consultancy",
  "ai-solution": "ai-solution",
  "ai solution": "ai-solution",
  chatbot: "ai-solution",
  "ai chatbot": "ai-solution",
  hosting: "hosting",
  other: "other",
};

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

    // Map project type
    const rawType = (projectRequest.requirements.projectType || "other").toLowerCase();
    const projectType = PROJECT_TYPE_MAP[rawType] || "other";

    // Generate project name
    const projectName = `${projectRequest.requirements.projectType} - ${projectRequest.client.name}`;
    const slug = projectName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") + "-" + Date.now().toString(36);

    // Create project with full lifecycle fields
    const project = await Project.create({
      name: projectName,
      slug,
      title: projectName,
      description: `${projectRequest.requirements.projectType} project for ${projectRequest.client.name}. ${projectRequest.requirements.objective}`,
      client: client._id,
      clientRef: client._id,
      agentRef: projectRequest.agent,
      conversationRef: projectRequest.conversation,
      projectType,
      status: "new",
      lifecycleStatus: "project-created",
      priority: projectRequest.requirements.budget?.max && projectRequest.requirements.budget.max > 10000 ? "high" : "medium",
      budget: projectRequest.requirements.budget?.max || 0,
      currency: projectRequest.requirements.budget?.currency || "USD",
      deadline: deadline ? new Date(deadline) : undefined,
      progress: 0,
      team: team || [],
      projectManager: projectManager || undefined,
      aiGeneratedRequirements: {
        projectType: projectRequest.requirements.projectType,
        features: projectRequest.requirements.features,
        budget: projectRequest.requirements.budget
          ? `${projectRequest.requirements.budget.min}-${projectRequest.requirements.budget.max}`
          : undefined,
        timeline: projectRequest.requirements.timeline,
        designStyle: projectRequest.requirements.designStyle,
        industry: projectRequest.requirements.industry,
        targetAudience: projectRequest.requirements.targetAudience,
        integrations: projectRequest.requirements.integrations,
      },
      financial: {
        quotedAmount: projectRequest.quote?.max || 0,
        approvedAmount: 0,
        invoicedAmount: 0,
        paidAmount: 0,
        outstandingAmount: projectRequest.quote?.max || 0,
        overdueAmount: 0,
        currency: projectRequest.requirements.budget?.currency || "USD",
      },
      scope: {
        description: projectRequest.requirements.objective || "",
        features: projectRequest.requirements.features || [],
        exclusions: [],
        assumptions: [],
        constraints: [],
        version: 1,
      },
      tags: [rawType, "ai-generated", "master-agent"],
    });

    // Create requirements from extracted data
    const requirementIds = [];
    if (projectRequest.requirements.features?.length) {
      for (const feature of projectRequest.requirements.features) {
        const req = await ProjectRequirement.create({
          project: project._id,
          title: feature,
          description: `Feature requirement: ${feature}`,
          category: "functional",
          priority: "must-have",
          scope: "in-scope",
          source: "ai",
          status: "proposed",
          createdBy: user.userId,
        });
        requirementIds.push(req._id);
      }
    }
    project.requirements = requirementIds;

    // Generate stages from templates
    const stageTemplates = generateStagesForProject(projectType);
    const createdStages = [];
    let order = 1;

    for (const template of stageTemplates) {
      const stage = await ProjectStage.create({
        project: project._id,
        name: template.name,
        description: template.description,
        order,
        type: template.type,
        status: order === 1 ? "active" : "pending",
        estimatedDays: template.estimatedDays,
        acceptanceCriteria: template.acceptanceCriteria,
        generatedBy: "ai",
      });

      const taskIds = [];
      let taskOrder = 1;
      for (const taskDef of template.tasks) {
        const task = await Task.create({
          title: taskDef.title,
          description: taskDef.description,
          project: project._id,
          stage: stage._id,
          reporter: user.userId,
          status: "todo",
          priority: taskDef.priority,
          estimatedHours: taskDef.estimatedHours,
          order: taskOrder,
        });
        taskIds.push(task._id);
        taskOrder++;
      }

      stage.tasks = taskIds;
      await stage.save();
      createdStages.push(stage);
      order++;
    }

    project.stages = createdStages.map((s) => s._id);
    project.currentStage = createdStages[0]?._id;
    project.status = "planning";
    project.lifecycleStatus = "requirements-gathered";
    await project.save();

    // Update project request
    projectRequest.project = project._id;
    projectRequest.status = "project-created";
    await projectRequest.save();

    // Update client stats
    client.totalProjects = (client.totalProjects || 0) + 1;
    await client.save();

    // Log all activities
    await logProjectActivity({
      project: project._id.toString(),
      actor: user.userId,
      actorType: "ai",
      action: "project-created",
      category: "project",
      description: `Project "${projectName}" created from AI agent requirements`,
      after: { name: projectName, projectType, client: client.name },
    });

    await logProjectActivity({
      project: project._id.toString(),
      actor: user.userId,
      actorType: "ai",
      action: "stages-generated",
      category: "stage",
      description: `Generated ${createdStages.length} stages for ${projectType} project`,
      after: { stageCount: createdStages.length, stages: createdStages.map((s) => s.name) },
    });

    await logProjectActivity({
      project: project._id.toString(),
      actor: user.userId,
      actorType: "ai",
      action: "requirements-created",
      category: "requirement",
      description: `Created ${requirementIds.length} initial requirements`,
      after: { requirementCount: requirementIds.length },
    });

    return NextResponse.json({
      project,
      client,
      stages: createdStages,
      requirements: requirementIds.length,
      message: "Project created with full lifecycle, stages, and requirements",
    }, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to create project";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
