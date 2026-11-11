import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import Project from "@/models/project";
import { calculateBudget, formatBudgetSummary, type BudgetEstimate } from "@/lib/budget-calculator";
import type { ProjectBrief } from "@/lib/project-discovery";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { projectId, conversationState } = body;

    // If projectId is provided, load existing project
    if (projectId) {
      await connectToDatabase();
      const project = await Project.findById(projectId).lean();
      if (!project) {
        return NextResponse.json({ error: "Project not found" }, { status: 404 });
      }

      const brief: Partial<ProjectBrief> = {
        projectType: (project.requirements?.projectType as ProjectBrief["projectType"]) || "website",
        features: project.requirements?.features || [],
        objective: project.requirements?.objective || "",
        targetAudience: project.requirements?.targetAudience || "",
        businessContext: {
          industry: project.requirements?.industry || "",
          description: project.description || "",
          customers: "",
        },
        designPreferences: project.requirements?.designStyle || "",
        technicalComplexity: "medium",
        integrations: project.requirements?.integrations || [],
        estimatedBudget: project.requirements?.budget || "",
        desiredTimeline: project.requirements?.timeline || "",
      };

      const estimate = await calculateBudget({
        projectType: brief.projectType || "website",
        features: brief.features || [],
        complexity: brief.technicalComplexity,
        budget: brief.estimatedBudget,
        timeline: brief.desiredTimeline,
        brief: brief as ProjectBrief,
      });

      return NextResponse.json({
        success: true,
        projectId: project._id,
        projectName: project.name,
        projectType: project.requirements?.projectType || "website",
        summary: buildProjectSummary(project, estimate),
        budget: estimate,
        milestones: project.milestones || [],
        firstMilestone: project.milestones?.[0] || null,
        status: project.status,
        canGeneratePrototype: project.milestones?.some(
          (m: { status: string }) => m.status === "pending" || m.status === "in-progress"
        ),
      });
    }

    // If conversation state is provided, generate summary from brief
    if (conversationState?.brief) {
      const brief = conversationState.brief as ProjectBrief;

      const estimate = await calculateBudget({
        projectType: brief.projectType || "website",
        features: brief.features || [],
        complexity: brief.technicalComplexity,
        budget: brief.estimatedBudget,
        timeline: brief.desiredTimeline,
        brief,
      });

      const projectName = generateProjectName(brief);

      return NextResponse.json({
        success: true,
        projectName,
        projectType: brief.projectType || "website",
        summary: {
          overview: {
            name: projectName,
            type: brief.projectType || "website",
            objective: brief.objective || "Not specified",
            industry: brief.businessContext?.industry || "Not specified",
            targetAudience: brief.targetAudience || "Not specified",
          },
          requirements: {
            confirmed: [
              brief.projectType && `Project type: ${brief.projectType}`,
              brief.objective && `Objective: ${brief.objective}`,
              brief.targetAudience && `Target audience: ${brief.targetAudience}`,
              brief.features?.length && `Features: ${brief.features.join(", ")}`,
              brief.integrations?.length && `Integrations: ${brief.integrations.join(", ")}`,
              brief.designPreferences && `Design preferences: ${brief.designPreferences}`,
            ].filter(Boolean) as string[],
            assumptions: estimate.assumptions,
            pending: brief.missingInformation || [],
          },
          expectedOutcome: generateExpectedOutcome(brief),
        },
        budget: estimate,
        budgetSummary: formatBudgetSummary(estimate),
        firstMilestone: estimate.milestoneBreakdown[0] || null,
        allMilestones: estimate.milestoneBreakdown,
        canGeneratePrototype: true,
      });
    }

    return NextResponse.json(
      { error: "Either projectId or conversationState is required" },
      { status: 400 }
    );
  } catch (error) {
    console.error("[Project Summary] Error:", error);
    return NextResponse.json(
      { error: "Failed to generate project summary" },
      { status: 500 }
    );
  }
}

function generateProjectName(brief: ProjectBrief): string {
  const type = (brief.projectType || "project").replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  const industry = brief.businessContext?.industry ? ` for ${brief.businessContext.industry}` : "";
  const objective = brief.objective ? ` — ${brief.objective}` : "";
  return `${type}${industry}${objective}`.slice(0, 100);
}

function generateExpectedOutcome(brief: ProjectBrief): string {
  const type = brief.projectType || "website";
  const outcomes: Record<string, string> = {
    website: "A fully functional, responsive website with modern design, SEO optimization, and content management capabilities.",
    "web-application": "A scalable web application with user authentication, database integration, and admin dashboard.",
    ecommerce: "A complete e-commerce store with product management, secure checkout, and order tracking.",
    "mobile-app": "A cross-platform mobile application with native features, offline support, and App Store deployment.",
    "ai-integration": "An AI-powered solution with intelligent automation, data processing, and performance monitoring.",
    crm: "A CRM system with contact management, pipeline tracking, and reporting dashboard.",
    erp: "An ERP system with finance, HR, and inventory modules integrated into a unified platform.",
    "ai-chatbot": "An AI chatbot with natural language processing, knowledge base, and multi-channel integration.",
    "ai-voice-agent": "A voice agent with natural conversation, call handling, and transcription capabilities.",
    design: "A complete design system with wireframes, prototypes, and brand guidelines.",
    "seo-marketing": "A digital marketing strategy with SEO optimization, analytics, and campaign management.",
    saas: "A SaaS platform with subscription management, user dashboard, and scalable architecture.",
  };
  return outcomes[type] || `A custom ${type} solution tailored to your business requirements.`;
}

function buildProjectSummary(
  project: Awaited<ReturnType<typeof Project.findById>> & Record<string, unknown>,
  estimate: BudgetEstimate
) {
  const requirements = project.requirements as Record<string, unknown> | undefined;
  return {
    overview: {
      name: project.name,
      type: requirements?.projectType || "website",
      objective: requirements?.objective || (project.description as string)?.slice(0, 200) || "Not specified",
      industry: requirements?.industry || "Not specified",
      targetAudience: requirements?.targetAudience || "Not specified",
    },
    requirements: {
      confirmed: [
        requirements?.projectType && `Project type: ${requirements.projectType}`,
        requirements?.objective && `Objective: ${requirements.objective}`,
        requirements?.targetAudience && `Target audience: ${requirements.targetAudience}`,
        Array.isArray(requirements?.features) && requirements.features.length > 0 && `Features: ${(requirements.features as string[]).join(", ")}`,
        Array.isArray(requirements?.integrations) && requirements.integrations.length > 0 && `Integrations: ${(requirements.integrations as string[]).join(", ")}`,
        requirements?.designStyle && `Design: ${requirements.designStyle}`,
      ].filter(Boolean) as string[],
      assumptions: estimate.assumptions,
      pending: [],
    },
    expectedOutcome: generateExpectedOutcome({
      projectType: requirements?.projectType as ProjectBrief["projectType"],
      objective: requirements?.objective as string,
      businessContext: { industry: requirements?.industry as string, description: "", customers: "" },
    } as ProjectBrief),
  };
}
