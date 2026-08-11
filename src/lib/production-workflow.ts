import { connectToDatabase } from "@/lib/mongodb";
import Project from "@/models/project";
import Client from "@/models/client";
import Lead from "@/models/lead";
import Inquiry from "@/models/inquiry";
import Preview, { createPreviewToken } from "@/models/preview";
import { calculateBudget, type BudgetEstimate } from "@/lib/budget-calculator";
import { generateDemoHTML, generateMilestonePrototype } from "@/lib/demo-generator";
import { logError } from "@/lib/error-logger";

// ============================================================
// TYPES
// ============================================================

export interface ProductionRequirements {
  // From discovery/AI
  projectType?: string;
  projectName?: string;
  clientName?: string;
  clientEmail?: string;
  clientPhone?: string;
  clientCompany?: string;
  features?: string[];
  budget?: string;
  timeline?: string;
  designStyle?: string;
  language?: string;

  // Extended requirements
  objective?: string;
  industry?: string;
  targetAudience?: string;
  integrations?: string[];
  pages?: string[];
  authRequired?: boolean;
  dbRequired?: boolean;
  adminDashboard?: boolean;
  clientDashboard?: boolean;
  apiRequired?: boolean;
  seoRequired?: boolean;
  securityLevel?: string;
  mobileRequired?: boolean;
  hostingRequired?: boolean;
  specialRequirements?: string[];
}

export interface ProductionResult {
  projectId: string;
  projectName: string;
  projectType: string;
  status: string;
  
  // What will be produced
  deliverables: {
    type: string;
    description: string;
    included: boolean;
  }[];
  
  // First milestone
  firstMilestone: {
    name: string;
    description: string;
    deliverables: string[];
    outputType: string;
  };
  
  // Cost breakdown
  costAnalysis: CostAnalysis;
  
  // Budget comparison
  budgetComparison: BudgetComparison;
  
  // Preview
  previewUrl: string | null;
  checkoutUrl: string;
  
  // Timestamps
  analyzedAt: string;
}

export interface CostAnalysis {
  developmentCost: CostBreakdown;
  thirdPartyCosts: CostBreakdown;
  recurringCosts: CostBreakdown;
  oneTimeCosts: CostBreakdown;
  totalEstimated: number;
  currency: string;
  confidenceLevel: "high" | "medium" | "low";
  assumptions: string[];
  priceVerificationNotes: string[];
}

export interface CostBreakdown {
  items: { name: string; description: string; amount: number; confirmed: boolean }[];
  subtotal: number;
}

export interface BudgetComparison {
  clientBudget: number | null;
  estimatedTotal: number;
  difference: number | null;
  status: "within-budget" | "below-budget" | "slightly-above" | "significantly-above" | "budget-not-provided";
  recommendations: string[];
}

// ============================================================
// MAIN PRODUCTION WORKFLOW
// ============================================================

export async function runProductionWorkflow(
  requirements: ProductionRequirements,
  options?: {
    skipPreview?: boolean;
    skipDemo?: boolean;
    existingProjectId?: string;
  }
): Promise<ProductionResult> {
  await connectToDatabase();

  // 1. Validate requirements
  const validatedReqs = validateRequirements(requirements);

  // 2. Create or update project
  const project = await createOrUpdateProject(validatedReqs, options?.existingProjectId);

  // 3. Run cost detection
  const costAnalysis = await detectCosts(validatedReqs);

  // 4. Compare with client budget
  const budgetComparison = compareBudget(costAnalysis, validatedReqs.budget);

  // 5. Generate budget estimate for project
  const budgetEstimate = await calculateBudget({
    projectType: validatedReqs.projectType,
    features: validatedReqs.features,
    complexity: inferComplexity(validatedReqs),
    budget: validatedReqs.budget,
    timeline: validatedReqs.timeline,
  });

  // 6. Update project with budget and milestones
  await updateProjectBudget(project._id.toString(), budgetEstimate);

  // 7. Generate demo/preview if not skipped
  let previewUrl: string | null = null;
  if (!options?.skipDemo) {
    previewUrl = await generatePreview(project._id.toString(), validatedReqs);
  }

  // 8. Create secure preview token if preview exists
  if (previewUrl && !options?.skipPreview) {
    const token = await createPreviewTokenForProject(project._id.toString());
    if (token) {
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://wall-v.com";
      previewUrl = `${appUrl}/preview/${token}`;
    }
  }

  // 9. Determine deliverables
  const deliverables = determineDeliverables(validatedReqs);

  // 10. Determine first milestone
  const firstMilestone = determineFirstMilestone(validatedReqs, budgetEstimate);

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://wall-v.com";

  return {
    projectId: project._id.toString(),
    projectName: project.name,
    projectType: validatedReqs.projectType || "website",
    status: project.status,
    deliverables,
    firstMilestone,
    costAnalysis,
    budgetComparison,
    previewUrl,
    checkoutUrl: `${appUrl}/checkout/${project._id}`,
    analyzedAt: new Date().toISOString(),
  };
}

// ============================================================
// HELPER FUNCTIONS
// ============================================================

function validateRequirements(reqs: ProductionRequirements): ProductionRequirements {
  return {
    ...reqs,
    projectType: reqs.projectType || "website",
    projectName: reqs.projectName || reqs.clientName
      ? `${reqs.clientName}'s ${reqs.projectType || "website"}`
      : "New Project",
    features: reqs.features || [],
    pages: reqs.pages || [],
    integrations: reqs.integrations || [],
    specialRequirements: reqs.specialRequirements || [],
  };
}

async function createOrUpdateProject(
  reqs: ProductionRequirements,
  existingProjectId?: string
) {
  const projectName = reqs.projectName || `${reqs.clientName}'s ${reqs.projectType}`;
  const slug = projectName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "") + `-${Date.now()}`;

  if (existingProjectId) {
    const project = await Project.findByIdAndUpdate(
      existingProjectId,
      {
        name: projectName,
        slug,
        description: generateProjectDescription(reqs),
        client: {
          name: reqs.clientName,
          email: reqs.clientEmail,
          phone: reqs.clientPhone || "",
          company: reqs.clientCompany || "",
        },
        requirements: {
          projectType: reqs.projectType,
          features: reqs.features,
          budget: reqs.budget,
          timeline: reqs.timeline,
          designStyle: reqs.designStyle,
          objective: reqs.objective,
          industry: reqs.industry,
          targetAudience: reqs.targetAudience,
          integrations: reqs.integrations,
        },
        language: reqs.language || "en",
      },
      { new: true }
    ).lean();
    return project!;
  }

  // Find or create client
  let client = null;
  if (reqs.clientEmail) {
    client = await Client.findOne({ email: reqs.clientEmail.toLowerCase().trim() });
  }
  if (!client && reqs.clientPhone) {
    client = await Client.findOne({ phone: reqs.clientPhone });
  }
  if (!client) {
    const placeholderEmail = reqs.clientEmail
      ? reqs.clientEmail.toLowerCase().trim()
      : `pending+${(reqs.clientName || "client").toLowerCase().replace(/\s+/g, ".")}${Date.now()}@wall-v.com`;
    client = await Client.create({
      name: reqs.clientName || "Unknown Client",
      email: placeholderEmail,
      phone: reqs.clientPhone || undefined,
      company: reqs.clientCompany || undefined,
      type: reqs.clientCompany ? "business" : "individual",
      status: "prospect",
      source: "ai-chatbot",
      tags: ["ai-generated", reqs.projectType || "website"],
      totalProjects: 0,
      totalSpent: 0,
      lastContact: new Date(),
    });
  }

  // Create lead
  let lead = null;
  if (reqs.clientEmail) {
    lead = await Lead.findOne({ email: reqs.clientEmail.toLowerCase().trim() });
    if (!lead) {
      lead = await Lead.create({
        name: reqs.clientName || "Unknown",
        email: reqs.clientEmail.toLowerCase().trim(),
        phone: reqs.clientPhone,
        company: reqs.clientCompany,
        source: "ai-chatbot",
        status: "new",
        score: 50,
        tags: ["ai-generated", reqs.projectType || "website"],
      });
    }
  }

  // Create inquiry
  const inquiry = await Inquiry.create({
    name: reqs.clientName || "Unknown",
    email: reqs.clientEmail || "",
    phone: reqs.clientPhone,
    company: reqs.clientCompany,
    subject: `Project: ${projectName}`,
    message: generateProjectDescription(reqs),
    source: "ai-chatbot",
    status: "new",
    type: "project",
    leadId: lead?._id,
    clientId: client._id,
  });

  // Create project with default milestones
  const project = await Project.create({
    name: projectName,
    slug,
    title: projectName,
    description: generateProjectDescription(reqs),
    client: {
      name: reqs.clientName || "Unknown",
      email: reqs.clientEmail || "",
      phone: reqs.clientPhone || "",
      company: reqs.clientCompany || "",
    },
    status: "planning",
    priority: "medium",
    budget: 0,
    spent: 0,
    currency: "USD",
    progress: 0,
    milestones: buildDefaultMilestones(reqs),
    team: [],
    tags: ["ai-generated", reqs.projectType || "website"],
    requirements: {
      projectType: reqs.projectType,
      features: reqs.features,
      budget: reqs.budget,
      timeline: reqs.timeline,
      designStyle: reqs.designStyle,
      objective: reqs.objective,
      industry: reqs.industry,
      targetAudience: reqs.targetAudience,
      integrations: reqs.integrations,
    },
    language: reqs.language || "en",
  });

  // Update client
  client.totalProjects = (client.totalProjects || 0) + 1;
  client.lastContact = new Date();
  await client.save();

  return project;
}

function generateProjectDescription(reqs: ProductionRequirements): string {
  const parts: string[] = [];
  if (reqs.objective) parts.push(`Objective: ${reqs.objective}`);
  if (reqs.projectType) parts.push(`Type: ${reqs.projectType}`);
  if (reqs.features?.length) parts.push(`Features: ${reqs.features.join(", ")}`);
  if (reqs.industry) parts.push(`Industry: ${reqs.industry}`);
  if (reqs.targetAudience) parts.push(`Target: ${reqs.targetAudience}`);
  return parts.join(". ") || `${reqs.projectType || "website"} project`;
}

function buildDefaultMilestones(reqs: ProductionRequirements) {
  const type = reqs.projectType || "website";
  const templates: Record<string, { name: string; description: string; deliverables: string[] }[]> = {
    website: [
      { name: "Discovery & Planning", description: "Requirements gathering, research, and project planning", deliverables: ["Project brief", "Sitemap", "Wireframes"] },
      { name: "Design", description: "UI/UX design and visual concepts", deliverables: ["Design mockups", "Style guide", "Responsive layouts"] },
      { name: "Development", description: "Frontend and backend implementation", deliverables: ["HTML/CSS/JS", "CMS integration", "Contact forms"] },
      { name: "Testing & Launch", description: "QA testing, optimization, and deployment", deliverables: ["Test results", "Performance optimization", "Deployment"] },
      { name: "Handover", description: "Documentation, training, and support", deliverables: ["User guide", "Training session", "30-day support"] },
    ],
    ecommerce: [
      { name: "Discovery & Planning", description: "Product catalog analysis and requirements", deliverables: ["Product catalog plan", "Payment strategy", "Shipping rules"] },
      { name: "Design", description: "Store design and product presentation", deliverables: ["Store design", "Product page layouts", "Checkout flow"] },
      { name: "Development", description: "Store build with payment integration", deliverables: ["Product management", "Cart & checkout", "Payment integration"] },
      { name: "Testing & Launch", description: "Testing all purchase flows", deliverables: ["Purchase testing", "Payment verification", "Launch"] },
      { name: "Handover", description: "Training and ongoing support", deliverables: ["Admin training", "Documentation", "Support"] },
    ],
    saas: [
      { name: "Discovery & Architecture", description: "SaaS architecture and subscription model", deliverables: ["Architecture plan", "Subscription tiers", "Database schema"] },
      { name: "Core Platform", description: "Authentication, billing, and core features", deliverables: ["Auth system", "Subscription billing", "User dashboard"] },
      { name: "Main Features", description: "Primary application features", deliverables: ["Feature 1", "Feature 2", "API"] },
      { name: "Admin & Analytics", description: "Administration and monitoring", deliverables: ["Admin dashboard", "Analytics", "User management"] },
      { name: "Launch & Scale", description: "Deployment, monitoring, and optimization", deliverables: ["Production deploy", "Monitoring", "Documentation"] },
    ],
  };

  return templates[type] || templates.website;
}

async function detectCosts(reqs: ProductionRequirements): Promise<CostAnalysis> {
  const budgetEstimate = await calculateBudget({
    projectType: reqs.projectType,
    features: reqs.features,
    complexity: inferComplexity(reqs),
    budget: reqs.budget,
    timeline: reqs.timeline,
  });

  const devCost: CostBreakdown = {
    items: [
      { name: "Project Management", description: "Planning, coordination, and communication", amount: Math.round(budgetEstimate.estimatedBudget.min * 0.1), confirmed: false },
      { name: "UI/UX Design", description: "Interface design and prototyping", amount: Math.round(budgetEstimate.estimatedBudget.min * 0.15), confirmed: false },
      { name: "Frontend Development", description: "Client-side implementation", amount: Math.round(budgetEstimate.estimatedBudget.min * 0.25), confirmed: false },
      { name: "Backend Development", description: "Server-side implementation", amount: Math.round(budgetEstimate.estimatedBudget.min * 0.25), confirmed: false },
      { name: "Testing & QA", description: "Quality assurance and testing", amount: Math.round(budgetEstimate.estimatedBudget.min * 0.1), confirmed: false },
      { name: "Deployment", description: "Production deployment and configuration", amount: Math.round(budgetEstimate.estimatedBudget.min * 0.05), confirmed: false },
    ],
    subtotal: budgetEstimate.estimatedBudget.min,
  };

  const thirdParty: CostBreakdown = {
    items: [
      { name: "Hosting (Monthly)", description: "Vercel or cloud hosting", amount: 20, confirmed: false },
      { name: "Domain (Annual)", description: "Domain registration", amount: 15, confirmed: false },
      { name: "SSL Certificate", description: "HTTPS certificate", amount: 0, confirmed: true },
      { name: "Email Service", description: "Transactional emails", amount: 10, confirmed: false },
    ],
    subtotal: 45,
  };

  const recurring: CostBreakdown = {
    items: [
      { name: "Hosting", description: "Monthly hosting fee", amount: 20, confirmed: false },
      { name: "Email Service", description: "Monthly email usage", amount: 10, confirmed: false },
      { name: "AI API Usage", description: "If AI features included", amount: reqs.features?.some(f => f.toLowerCase().includes("ai")) ? 50 : 0, confirmed: false },
    ],
    subtotal: reqs.features?.some(f => f.toLowerCase().includes("ai")) ? 80 : 30,
  };

  const oneTime: CostBreakdown = {
    items: [
      { name: "Development", description: "One-time development cost", amount: budgetEstimate.estimatedBudget.min, confirmed: false },
      { name: "Design Setup", description: "Initial design and branding", amount: Math.round(budgetEstimate.estimatedBudget.min * 0.15), confirmed: false },
    ],
    subtotal: Math.round(budgetEstimate.estimatedBudget.min * 1.15),
  };

  const totalEstimated = budgetEstimate.estimatedBudget.min;
  const assumptions: string[] = [];
  const priceVerificationNotes: string[] = [];

  if (!reqs.budget) {
    assumptions.push("Budget based on estimated project scope, not client-provided budget");
  }
  assumptions.push("Third-party costs are estimates and require verification");
  priceVerificationNotes.push("Hosting price requires verification based on actual usage");
  priceVerificationNotes.push("AI API costs depend on actual usage volume");

  return {
    developmentCost: devCost,
    thirdPartyCosts: thirdParty,
    recurringCosts: recurring,
    oneTimeCosts: oneTime,
    totalEstimated,
    currency: "USD",
    confidenceLevel: reqs.budget ? "medium" : "low",
    assumptions,
    priceVerificationNotes,
  };
}

function compareBudget(costs: CostAnalysis, clientBudget?: string): BudgetComparison {
  const parsedBudget = clientBudget
    ? parseInt(String(clientBudget).replace(/[^0-9]/g, ""))
    : null;

  const estimatedTotal = costs.totalEstimated;

  if (!parsedBudget || isNaN(parsedBudget)) {
    return {
      clientBudget: null,
      estimatedTotal,
      difference: null,
      status: "budget-not-provided",
      recommendations: ["Client budget not provided. Present estimate for review."],
    };
  }

  const difference = parsedBudget - estimatedTotal;
  const percentDiff = (difference / estimatedTotal) * 100;

  let status: BudgetComparison["status"];
  let recommendations: string[] = [];

  if (percentDiff >= 0) {
    status = "within-budget";
    recommendations.push("Project appears within budget. Proceed with proposal.");
  } else if (percentDiff >= -20) {
    status = "slightly-above";
    recommendations.push("Project slightly exceeds budget. Consider reducing scope or adjusting timeline.");
    recommendations.push("Focus on MVP features for first milestone.");
  } else {
    status = "significantly-above";
    recommendations.push("Project significantly exceeds budget. Recommend phased approach.");
    recommendations.push("Identify core features for Phase 1 within budget.");
    recommendations.push("Defer advanced features to Phase 2.");
  }

  return {
    clientBudget: parsedBudget,
    estimatedTotal,
    difference,
    status,
    recommendations,
  };
}

function inferComplexity(reqs: ProductionRequirements): "low" | "medium" | "high" {
  const featureCount = reqs.features?.length || 0;
  const hasAI = reqs.features?.some(f => f.toLowerCase().includes("ai")) || false;
  const hasPayment = reqs.features?.some(f => f.toLowerCase().includes("payment")) || false;
  const hasAuth = reqs.authRequired || false;

  if (hasAI || (featureCount > 6 && hasPayment && hasAuth)) return "high";
  if (featureCount > 3 || hasPayment || hasAuth) return "medium";
  return "low";
}

function determineDeliverables(reqs: ProductionRequirements) {
  const type = reqs.projectType || "website";
  const deliverables = [
    { type: "Design", description: "UI/UX design and visual concepts", included: true },
    { type: "Frontend", description: "Responsive web application", included: true },
  ];

  if (reqs.apiRequired || type === "web-application" || type === "saas") {
    deliverables.push({ type: "Backend API", description: "Server-side API endpoints", included: true });
  }
  if (reqs.dbRequired || type === "web-application" || type === "saas") {
    deliverables.push({ type: "Database", description: "Database design and implementation", included: true });
  }
  if (reqs.authRequired || type === "saas") {
    deliverables.push({ type: "Authentication", description: "User authentication system", included: true });
  }
  if (reqs.adminDashboard) {
    deliverables.push({ type: "Admin Dashboard", description: "Administration panel", included: true });
  }
  if (reqs.clientDashboard) {
    deliverables.push({ type: "Client Dashboard", description: "Client-facing dashboard", included: true });
  }
  if (type === "ecommerce") {
    deliverables.push({ type: "Payment Integration", description: "Payment processing", included: true });
    deliverables.push({ type: "Product Management", description: "Product catalog system", included: true });
  }
  if (reqs.seoRequired) {
    deliverables.push({ type: "SEO", description: "Search engine optimization", included: true });
  }
  deliverables.push({ type: "Testing", description: "Quality assurance and testing", included: true });
  deliverables.push({ type: "Deployment", description: "Production deployment", included: true });
  deliverables.push({ type: "Documentation", description: "Project documentation", included: true });

  return deliverables;
}

function determineFirstMilestone(
  reqs: ProductionRequirements,
  budgetEstimate: BudgetEstimate
) {
  const type = reqs.projectType || "website";
  const firstMilestone = budgetEstimate.milestoneBreakdown[0];

  return {
    name: firstMilestone?.name || "Discovery & Planning",
    description: firstMilestone?.description || "Initial project discovery, requirements analysis, and planning",
    deliverables: firstMilestone?.deliverables || ["Project brief", "Sitemap", "Wireframes", "Technical plan"],
    outputType: "prototype",
  };
}

async function generatePreview(
  projectId: string,
  reqs: ProductionRequirements
): Promise<string | null> {
  try {
    const project = await Project.findById(projectId).lean();
    if (!project) return null;

    const demoRequirements = {
      projectType: reqs.projectType,
      name: reqs.clientName || "Client",
      email: reqs.clientEmail || "",
      features: reqs.features,
      budget: reqs.budget || "1000",
      timeline: reqs.timeline || "",
      description: reqs.objective || "",
      selectedOption: "",
      company: reqs.clientCompany || "",
      phone: reqs.clientPhone || "",
    };

    const demoHTML = generateDemoHTML(demoRequirements, projectId);
    await Project.findByIdAndUpdate(projectId, { demoHTML, demoId: `demo-${Date.now()}` });

    return `/preview/${projectId}`;
  } catch (error) {
    await logError({
      level: "error",
      message: "Failed to generate preview",
      source: "production-workflow",
      stack: error instanceof Error ? error.stack : undefined,
      metadata: { projectId },
    });
    return null;
  }
}

async function createPreviewTokenForProject(projectId: string): Promise<string | null> {
  try {
    const { token, tokenHash } = createPreviewToken();
    const previewExpiryMinutes = 5;

    await Preview.create({
      projectId,
      token,
      tokenHash,
      status: "active",
      expiresAt: new Date(Date.now() + previewExpiryMinutes * 60 * 1000),
      accessCount: 0,
      maxAccesses: 10,
      paymentRequired: true,
      paymentStatus: "unpaid",
      accessLog: [
        {
          timestamp: new Date(),
          event: "PREVIEW_CREATED",
          details: "Created via production workflow",
        },
      ],
    });

    return token;
  } catch (error) {
    await logError({
      level: "error",
      message: "Failed to create preview token",
      source: "production-workflow",
      stack: error instanceof Error ? error.stack : undefined,
      metadata: { projectId },
    });
    return null;
  }
}

async function updateProjectBudget(
  projectId: string,
  budgetEstimate: BudgetEstimate
) {
  await Project.findByIdAndUpdate(projectId, {
    budget: budgetEstimate.estimatedBudget.max,
    quote: {
      min: budgetEstimate.estimatedBudget.min,
      max: budgetEstimate.estimatedBudget.max,
      currency: budgetEstimate.estimatedBudget.currency,
    },
    milestones: budgetEstimate.milestoneBreakdown.map((m) => ({
      name: m.name,
      description: m.description,
      amount: m.amount,
      status: "pending" as const,
      deliverables: m.deliverables,
    })),
  });
}
