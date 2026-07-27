import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import Project from "@/models/project";
import Lead from "@/models/lead";
import Inquiry from "@/models/inquiry";

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "") + `-${Date.now()}`;
}

export async function POST(request: Request) {
  try {
    await connectToDatabase();
    const body = await request.json();

    const {
      name,
      description,
      clientName,
      clientEmail,
      projectType,
      features,
      budget,
      timeline,
      designStyle,
      language,
      estimatedQuote,
    } = body;

    if (!name || !description) {
      return NextResponse.json(
        { error: "Name and description are required" },
        { status: 400 }
      );
    }

    // Create or find lead
    let leadId = null;
    if (clientEmail) {
      const existingLead = await Lead.findOne({ email: clientEmail });
      if (existingLead) {
        leadId = existingLead._id;
      } else {
        const lead = await Lead.create({
          name: clientName || "Web Visitor",
          email: clientEmail,
          source: "ai-chatbot",
          status: "new",
          score: 50,
          budget: budget || "",
          requirements: description,
          serviceInterest: projectType || "",
          tags: ["ai-generated", projectType].filter(Boolean),
        });
        leadId = lead._id;
      }
    }

    // Create inquiry
    const inquiry = await Inquiry.create({
      name: clientName || "Web Visitor",
      email: clientEmail || "",
      subject: `AI Project: ${name}`,
      message: description,
      type: "project",
      status: "new",
      priority: "medium",
      source: "ai-chatbot",
      lead: leadId,
      estimatedBudget: budget || "",
      estimatedTimeline: timeline || "",
      tags: ["ai-generated", projectType].filter(Boolean),
    });

    // Build default milestones from project type
    const defaultMilestones = buildDefaultMilestones(projectType, features);

    // Calculate milestone amounts from quote
    let milestoneAmounts: number[] = [];
    if (estimatedQuote?.min && estimatedQuote?.max) {
      const avg = (estimatedQuote.min + estimatedQuote.max) / 2;
      milestoneAmounts = defaultMilestones.map(() =>
        Math.round(avg / defaultMilestones.length)
      );
    }

    // Create project
    const slug = slugify(name);
    const project = await Project.create({
      name,
      slug,
      title: name,
      description,
      client: {
        name: clientName || "Web Visitor",
        email: clientEmail || "",
      },
      status: "demo",
      priority: "medium",
      budget: estimatedQuote?.min || 0,
      currency: estimatedQuote?.currency || "USD",
      progress: 0,
      milestones: defaultMilestones.map((m, i) => ({
        ...m,
        amount: milestoneAmounts[i] || 0,
      })),
      requirements: {
        projectType: projectType || "website",
        features: features || [],
        budget: budget || "",
        timeline: timeline || "",
        designStyle: designStyle || "",
      },
      quote: estimatedQuote
        ? {
            min: estimatedQuote.min,
            max: estimatedQuote.max,
            currency: estimatedQuote.currency || "USD",
          }
        : undefined,
      language: language || "en",
      tags: ["ai-generated", projectType].filter(Boolean),
      notes: `Created by AI chatbot. Inquiry: ${inquiry._id}`,
    });

    return NextResponse.json({
      success: true,
      project: {
        id: project._id,
        name: project.name,
        slug: project.slug,
        status: project.status,
        quote: project.quote,
        milestones: project.milestones,
        checkoutUrl: `/checkout/${project._id}`,
        previewUrl: `/preview/${project._id}`,
      },
      inquiry: { id: inquiry._id },
      lead: leadId ? { id: leadId } : null,
    }, { status: 201 });
  } catch (error) {
    console.error("Error creating project from agent:", error);
    return NextResponse.json(
      { error: "Failed to create project" },
      { status: 500 }
    );
  }
}

function buildDefaultMilestones(
  projectType: string | null,
  features: string[] | undefined
): { name: string; description: string; status: "pending"; dueDate?: string }[] {
  const base = projectType || "website";

  const templates: Record<string, { name: string; description: string }[]> = {
    website: [
      { name: "Discovery & Planning", description: "Requirements gathering, sitemap, wireframes" },
      { name: "Design", description: "UI/UX design, brand integration, responsive layouts" },
      { name: "Development", description: "Frontend and backend implementation" },
      { name: "Content & SEO", description: "Content creation, SEO optimization, meta tags" },
      { name: "Testing & Launch", description: "QA testing, bug fixes, deployment" },
    ],
    "web-application": [
      { name: "Discovery & Architecture", description: "Requirements, system architecture, database design" },
      { name: "UI/UX Design", description: "Wireframes, prototypes, design system" },
      { name: "Core Development", description: "API, database, authentication, core features" },
      { name: "Feature Development", description: "Advanced features, integrations, AI components" },
      { name: "Testing & Deployment", description: "QA, performance testing, deployment" },
    ],
    ecommerce: [
      { name: "Discovery & Planning", description: "Product catalog, payment flow, user journeys" },
      { name: "Design", description: "Store design, product pages, checkout flow" },
      { name: "Development", description: "Store setup, product management, payments" },
      { name: "Content & Products", description: "Product listings, descriptions, images" },
      { name: "Testing & Launch", description: "Payment testing, QA, go-live" },
    ],
    "mobile-app": [
      { name: "Discovery & Planning", description: "Requirements, platform choice, app architecture" },
      { name: "UI/UX Design", description: "App wireframes, design system, prototypes" },
      { name: "Core Development", description: "App development, API integration" },
      { name: "Features & Polish", description: "Advanced features, animations, offline support" },
      { name: "Testing & Release", description: "QA, App Store submission, launch" },
    ],
    "ai-integration": [
      { name: "Discovery & Design", description: "AI use case analysis, model selection, architecture" },
      { name: "Data & Training", description: "Data preparation, model training, fine-tuning" },
      { name: "Integration", description: "API development, UI integration, testing" },
      { name: "Optimization", description: "Performance tuning, accuracy improvement" },
      { name: "Deployment", description: "Production deployment, monitoring setup" },
    ],
    default: [
      { name: "Discovery & Planning", description: "Requirements gathering and project planning" },
      { name: "Design", description: "UI/UX design and prototyping" },
      { name: "Development", description: "Core implementation" },
      { name: "Testing", description: "Quality assurance and bug fixes" },
      { name: "Launch", description: "Deployment and go-live" },
    ],
  };

  const template = templates[base] || templates.default;

  // Add feature-specific milestones if many features
  if (features && features.length > 5) {
    template.splice(3, 0, {
      name: "Additional Features",
      description: `Implementation of: ${features.slice(3).join(", ")}`,
    });
  }

  return template.map((t) => ({
    ...t,
    status: "pending" as const,
  }));
}
