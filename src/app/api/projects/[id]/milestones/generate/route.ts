import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import Project from "@/models/project";
import { getAuthUserFromCookie } from "@/lib/auth-cookie";
import { generateMilestonePrototype, type MilestonePrototypeRequirements } from "@/lib/demo-generator";
import { notifyAdmins, createNotification } from "@/lib/notify";

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = await getAuthUserFromCookie();
    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const milestoneIndex = body.milestoneIndex ?? 0;

    await connectToDatabase();
    const project = await Project.findById(id);
    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    // Check ownership or admin
    const clientObj = project.client as { name?: string; email?: string };
    const isOwner = authUser.email === clientObj?.email;
    const isAdmin = ["super-admin", "admin", "manager"].includes(authUser.role);
    if (!isOwner && !isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Validate milestone index
    if (milestoneIndex >= (project.milestones?.length || 0)) {
      return NextResponse.json(
        { error: "Invalid milestone index" },
        { status: 400 }
      );
    }

    const milestone = project.milestones[milestoneIndex];
    const totalMilestones = project.milestones.length;

    // Build milestone prototype requirements
    const prototypeRequirements: MilestonePrototypeRequirements = {
      projectType: project.requirements?.projectType || "website",
      projectName: project.name,
      clientName: clientObj?.name || "Client",
      clientEmail: clientObj?.email || "",
      milestoneIndex,
      milestoneName: milestone.name,
      milestoneDescription: milestone.description || "",
      deliverables: milestone.deliverables || getDefaultDeliverables(project.requirements?.projectType || "website", milestone.name),
      features: project.requirements?.features || [],
      budget: project.requirements?.budget,
      totalBudget: project.budget,
      milestoneAmount: milestone.amount,
      timeline: project.requirements?.timeline,
      designPreferences: project.requirements?.designStyle,
      industry: project.requirements?.industry,
      objective: project.requirements?.objective,
      totalMilestones,
    };

    // Generate the prototype HTML
    const demoId = `milestone-${milestoneIndex}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const demoHTML = generateMilestonePrototype(prototypeRequirements, project._id.toString());

    // Update project with generated milestone
    project.milestones[milestoneIndex].status = "generated";
    project.milestones[milestoneIndex].generatedAt = new Date();
    project.milestones[milestoneIndex].previewUrl = `/projects/${project._id}/milestones/${milestoneIndex}/preview`;
    project.milestones[milestoneIndex].version = (milestone.version || 0) + 1;

    // Store version
    if (!project.milestoneVersions) {
      project.milestoneVersions = [];
    }
    project.milestoneVersions.push({
      version: (milestone.version || 0) + 1,
      milestoneName: milestone.name,
      milestoneIndex,
      previewUrl: `/projects/${project._id}/milestones/${milestoneIndex}/preview`,
      demoId,
      generatedAt: new Date(),
      requirements: prototypeRequirements as unknown as Record<string, unknown>,
      status: "generated",
      generatedBy: isAdmin ? "admin" : "ai",
    });

    // Store demo HTML on the project
    project.demoHTML = demoHTML;
    project.demoId = demoId;

    // Update project status if it was in planning/demo
    if (project.status === "planning" || project.status === "demo") {
      project.status = "in-progress";
    }

    // Add project update
    if (!project.updates) {
      project.updates = [];
    }
    project.updates.push({
      title: `Milestone "${milestone.name}" generated`,
      description: `Prototype for milestone ${milestoneIndex + 1} of ${totalMilestones} has been generated.`,
      author: authUser.userId,
      createdAt: new Date(),
      milestoneIndex,
    });

    await project.save();

    // Notify
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://www.wall-v.com";
    const previewUrl = `${appUrl}/projects/${project._id}/milestones/${milestoneIndex}/preview`;

    if (clientObj?.email) {
      const userId = authUser.userId;
      createNotification(
        userId,
        "Milestone Prototype Ready",
        `Your prototype for "${milestone.name}" is ready to preview.`,
        "success",
        previewUrl
      ).catch(() => {});
    }
    notifyAdmins(
      "Milestone Generated",
      `"${milestone.name}" for project "${project.name}" was generated`,
      "success",
      `/dashboard/projects/${project._id}/edit`
    ).catch(() => {});

    return NextResponse.json({
      success: true,
      milestone: {
        name: milestone.name,
        index: milestoneIndex,
        status: "generated",
        previewUrl: `/projects/${project._id}/milestones/${milestoneIndex}/preview`,
        version: project.milestones[milestoneIndex].version,
      },
      demoId,
      checkoutUrl: `/checkout/${project._id}`,
    });
  } catch (error) {
    console.error("[Generate Milestone] Error:", error);
    return NextResponse.json(
      { error: "Failed to generate milestone" },
      { status: 500 }
    );
  }
}

function getDefaultDeliverables(projectType: string, milestoneName: string): string[] {
  const nameLower = milestoneName.toLowerCase();
  if (nameLower.includes("discovery") || nameLower.includes("planning")) {
    return ["Project brief", "Sitemap", "Wireframes", "Technology selection"];
  }
  if (nameLower.includes("design")) {
    return ["Design mockups", "Style guide", "Responsive layouts", "Client approval"];
  }
  if (nameLower.includes("development") || nameLower.includes("build")) {
    return ["Working prototype", "Core features", "Integration", "Testing"];
  }
  if (nameLower.includes("content") || nameLower.includes("seo")) {
    return ["Page content", "SEO optimization", "Analytics setup", "Performance tuning"];
  }
  if (nameLower.includes("testing") || nameLower.includes("launch")) {
    return ["QA testing", "Bug fixes", "Deployment", "Go-live support"];
  }
  return ["Deliverable 1", "Deliverable 2", "Deliverable 3", "Deliverable 4"];
}
