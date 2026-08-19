import { connectToDatabase } from "@/lib/mongodb";
import Project from "@/models/project";
import Client from "@/models/client";
import Lead from "@/models/lead";
import Inquiry from "@/models/inquiry";
import Preview, { createPreviewToken } from "@/models/preview";
import ServicePrice from "@/models/service-price";
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

  // Extended requirements (from spec)
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

  // Distinction fields
  userProvidedRequirements?: Record<string, unknown>;
  agentRecommendations?: Record<string, unknown>;
  assumptions?: string[];
  missingInformation?: string[];

  // Detailed requirements from spec
  businessPurpose?: string;
  platform?: string;
  technologyPreferences?: string[];
  requiredPages?: string[];
  requiredFeatures?: string[];
  authenticationRequirements?: string[];
  databaseRequirements?: string[];
  adminDashboardRequirements?: string[];
  clientDashboardRequirements?: string[];
  apiRequirements?: string[];
  designRequirements?: string[];
  brandingRequirements?: string[];
  animationRequirements?: string[];
  graphicsRequirements?: string[];
  contentRequirements?: string[];
  seoRequirements?: string[];
  securityRequirements?: string[];
  hostingDeploymentRequirements?: string[];
  mobileRequirements?: string[];
  thirdPartyServices?: string[];
  expectedTimeline?: string;
  clientProvidedBudget?: string;
  otherConstraints?: string[];
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
    category: "development" | "third-party" | "design" | "testing" | "deployment" | "documentation";
    source: "user-provided" | "agent-recommended" | "assumption" | "standard";
  }[];

  // Production summary
  productionSummary: {
    whatWillBeProduced: string; // Website, Web Application, Mobile App, SaaS, Ecommerce, AI Agent, API, Dashboard, Automation, Design Package, Digital Product, Other
    description: string;
    targetOutcome: string;
  };

  // First milestone
  firstMilestone: {
    name: string;
    description: string;
    deliverables: string[];
    outputType: "ui-prototype" | "interactive-frontend" | "landing-page" | "dashboard-prototype" | "application-shell" | "feature-demonstration" | "ai-agent-prototype" | "workflow-prototype" | "design-concept" | "technical-poc";
    prototypeGenerated: boolean;
    previewUrl: string | null;
    prototypeHTML?: string;
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
  includedItems: string[];
  excludedItems: string[];
  confirmedPrices: string[];
  estimatedPrices: string[];
  requiresVerification: string[];
}

export interface CostBreakdown {
  items: CostItem[];
  subtotal: number;
}

export interface CostItem {
  name: string;
  description: string;
  amount: number;
  confirmed: boolean;
  category: string;
  verificationStatus: "confirmed" | "estimate" | "requires-verification";
  source: "database" | "calculated" | "standard" | "external";
}

export interface BudgetComparison {
  clientBudget: number | null;
  estimatedTotal: number;
  difference: number | null;
  status: "within-budget" | "below-budget" | "slightly-above" | "significantly-above" | "budget-not-provided";
  recommendations: string[];
  topCostDrivers: { name: string; amount: number; percentage: number }[];
  reducedMilestoneProposal?: {
    name: string;
    description: string;
    estimatedCost: number;
    deliverables: string[];
  };
}

export interface ProjectWorkflowStatus {
  stage: "requirements-collected" | "analysis-complete" | "prototype-pending" | "prototype-ready" | "awaiting-client-review" | "awaiting-payment" | "in-development" | "review" | "approved" | "completed";
  lastUpdated: string;
  details?: Record<string, unknown>;
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

export interface CostItem {
  name: string;
  description: string;
  amount: number;
  confirmed: boolean;
  category: string;
  verificationStatus: "confirmed" | "estimate" | "requires-verification";
  source: "database" | "calculated" | "standard" | "external";
}

export interface CostBreakdown {
  items: CostItem[];
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

  // 11. Generate first milestone prototype if not skipped
  if (!options?.skipDemo) {
    const prototypeResult = await generateFirstMilestonePrototype(project._id.toString(), validatedReqs, firstMilestone, budgetEstimate);
    firstMilestone.prototypeGenerated = prototypeResult.success;
    firstMilestone.previewUrl = prototypeResult.previewUrl;
    firstMilestone.prototypeHTML = prototypeResult.prototypeHTML ?? undefined;

    // Update project with milestone prototype
    if (prototypeResult.success) {
      await updateProjectWithMilestonePrototype(project._id.toString(), prototypeResult);
    }
  }

  // 12. Generate production summary
  const productionSummary = generateProductionSummary(validatedReqs, firstMilestone, costAnalysis);

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
    productionSummary,
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
    type: "sales",
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
  // Load ServicePrice data for accurate pricing
  const servicePrices = await ServicePrice.find({ active: true }).lean();

  const budgetEstimate = await calculateBudget({
    projectType: reqs.projectType,
    features: reqs.features,
    complexity: inferComplexity(reqs),
    budget: reqs.budget,
    timeline: reqs.timeline,
  });

  const baseDevCost = budgetEstimate.estimatedBudget.min;

  // Helper to create cost items with full metadata
  const createCostItem = (
    name: string,
    description: string,
    amount: number,
    category: string,
    verified: boolean = false,
    source: "database" | "calculated" | "standard" | "external" = "calculated"
  ): CostItem => ({
    name,
    description,
    amount,
    confirmed: verified,
    category,
    verificationStatus: verified ? "confirmed" : "estimate",
    source,
  });

  // Development Cost Breakdown
  const devItems: CostItem[] = [
    createCostItem(
      "Project Management",
      "Planning, coordination, and communication",
      Math.round(baseDevCost * 0.1),
      "development",
      false,
      "calculated"
    ),
    createCostItem(
      "UI/UX Design",
      "Interface design and user experience",
      Math.round(baseDevCost * 0.15),
      "design",
      false,
      "calculated"
    ),
    createCostItem(
      "Frontend Development",
      "Client-side implementation",
      Math.round(baseDevCost * 0.25),
      "frontend",
      false,
      "calculated"
    ),
    createCostItem(
      "Backend Development",
      "Server-side implementation",
      Math.round(baseDevCost * 0.25),
      "backend",
      false,
      "calculated"
    ),
    createCostItem(
      "Database Design & Setup",
      "Schema design, migrations, configuration",
      Math.round(baseDevCost * 0.08),
      "database",
      false,
      "calculated"
    ),
    createCostItem(
      "API Development",
      "REST/GraphQL API implementation",
      reqs.apiRequired ? Math.round(baseDevCost * 0.1) : 0,
      "api",
      false,
      "calculated"
    ),
    createCostItem(
      "Authentication System",
      "Auth, RBAC, OAuth integration",
      reqs.authRequired ? Math.round(baseDevCost * 0.08) : 0,
      "auth",
      false,
      "calculated"
    ),
    createCostItem(
      "AI/ML Integration",
      "Model integration, prompt engineering",
      reqs.features?.some(f => f.toLowerCase().includes("ai")) ? Math.round(baseDevCost * 0.15) : 0,
      "ai",
      false,
      "calculated"
    ),
    createCostItem(
      "Mobile Development",
      "iOS/Android or cross-platform",
      reqs.mobileRequired ? Math.round(baseDevCost * 0.3) : 0,
      "mobile",
      false,
      "calculated"
    ),
    createCostItem(
      "Testing & QA",
      "Quality assurance and testing",
      Math.round(baseDevCost * 0.1),
      "testing",
      false,
      "calculated"
    ),
    createCostItem(
      "Deployment & DevOps",
      "CI/CD, production deployment",
      Math.round(baseDevCost * 0.05),
      "deployment",
      false,
      "calculated"
    ),
  ].filter(item => item.amount > 0);

  const devCost: CostBreakdown = {
    items: devItems,
    subtotal: devItems.reduce((sum, item) => sum + item.amount, 0),
  };

  // Third-Party Costs (from ServicePrice where possible)
  const hostingPrice = servicePrices.find(p => p.serviceKey === "hosting" && p.category === "hosting");
  const domainPrice = servicePrices.find(p => p.serviceKey === "domain" && p.category === "domains");
  const emailPrice = servicePrices.find(p => p.serviceKey === "email-service" && p.category === "other");

  const thirdPartyItems: CostItem[] = [
    createCostItem(
      "Hosting",
      hostingPrice ? `${hostingPrice.name} (${hostingPrice.type})` : "Cloud hosting (Vercel/AWS/GCP)",
      hostingPrice?.basePrice || 20,
      "hosting",
      !!hostingPrice,
      hostingPrice ? "database" : "standard"
    ),
    createCostItem(
      "Domain Registration",
      domainPrice ? `${domainPrice.name} (${domainPrice.type})` : "Domain registration (annual)",
      domainPrice?.basePrice || 15,
      "domain",
      !!domainPrice,
      domainPrice ? "database" : "standard"
    ),
    createCostItem(
      "SSL Certificate",
      "HTTPS certificate (Let's Encrypt or paid)",
      0,
      "ssl",
      true,
      "standard"
    ),
    createCostItem(
      "Email Service",
      emailPrice ? `${emailPrice.name} (${emailPrice.type})` : "Transactional email service",
      emailPrice?.basePrice || 10,
      "email",
      !!emailPrice,
      emailPrice ? "database" : "standard"
    ),
    createCostItem(
      "Payment Processing",
      "Stripe/PayPal transaction fees (usage-based)",
      0, // Usage-based, no fixed cost
      "payment",
      false,
      "external"
    ),
    createCostItem(
      "CDN/Storage",
      "Content delivery and file storage",
      reqs.features?.some(f => f.toLowerCase().includes("cdn") || f.toLowerCase().includes("storage")) ? 25 : 0,
      "cdn",
      false,
      "standard"
    ),
    createCostItem(
      "AI Model API",
      "OpenAI/Anthropic API usage (usage-based)",
      reqs.features?.some(f => f.toLowerCase().includes("ai")) ? 0 : 0,
      "ai-api",
      false,
      "external"
    ),
  ].filter(item => item.amount > 0 || item.name === "SSL Certificate" || item.name === "Payment Processing" || item.name === "AI Model API");

  const thirdParty: CostBreakdown = {
    items: thirdPartyItems,
    subtotal: thirdPartyItems.reduce((sum, item) => sum + item.amount, 0),
  };

  // Recurring Costs (monthly/annual/usage-based)
  const recurringItems: CostItem[] = [
    createCostItem(
      "Hosting (Monthly)",
      "Ongoing hosting cost",
      hostingPrice?.basePrice || 20,
      "hosting",
      !!hostingPrice,
      hostingPrice ? "database" : "standard"
    ),
    createCostItem(
      "Email Service (Monthly)",
      "Ongoing email service cost",
      emailPrice?.basePrice || 10,
      "email",
      !!emailPrice,
      emailPrice ? "database" : "standard"
    ),
    createCostItem(
      "AI API Usage (Monthly)",
      "Estimated AI model API costs based on expected usage",
      reqs.features?.some(f => f.toLowerCase().includes("ai")) ? 50 : 0,
      "ai-api",
      false,
      "external"
    ),
    createCostItem(
      "Domain Renewal (Annual)",
      "Annual domain renewal",
      domainPrice?.basePrice || 15,
      "domain",
      !!domainPrice,
      domainPrice ? "database" : "standard"
    ),
    createCostItem(
      "CDN/Storage (Monthly)",
      "Ongoing CDN and storage costs",
      reqs.features?.some(f => f.toLowerCase().includes("cdn") || f.toLowerCase().includes("storage")) ? 25 : 0,
      "cdn",
      false,
      "standard"
    ),
    createCostItem(
      "Monitoring & Analytics (Monthly)",
      "Application monitoring and analytics",
      30,
      "monitoring",
      false,
      "standard"
    ),
  ].filter(item => item.amount > 0);

  const recurring: CostBreakdown = {
    items: recurringItems,
    subtotal: recurringItems.reduce((sum, item) => sum + item.amount, 0),
  };

  // One-Time Costs
  const oneTimeItems: CostItem[] = [
    createCostItem(
      "Development",
      "One-time development cost",
      devCost.subtotal,
      "development",
      false,
      "calculated"
    ),
    createCostItem(
      "Design Setup",
      "Initial design, branding, style guide",
      Math.round(baseDevCost * 0.15),
      "design",
      false,
      "calculated"
    ),
    createCostItem(
      "Initial Configuration",
      "Server setup, CI/CD, environments",
      Math.round(baseDevCost * 0.05),
      "setup",
      false,
      "standard"
    ),
    createCostItem(
      "Data Migration",
      "If migrating from existing system",
      reqs.specialRequirements?.some(r => r.toLowerCase().includes("migrat")) ? Math.round(baseDevCost * 0.1) : 0,
      "migration",
      false,
      "calculated"
    ),
    createCostItem(
      "Third-Party Setup",
      "Initial API keys, integrations configuration",
      reqs.integrations?.length ? reqs.integrations.length * 100 : 0,
      "integration-setup",
      false,
      "standard"
    ),
  ].filter(item => item.amount > 0);

  const oneTime: CostBreakdown = {
    items: oneTimeItems,
    subtotal: oneTimeItems.reduce((sum, item) => sum + item.amount, 0),
  };

  const totalEstimated = devCost.subtotal + thirdParty.subtotal + recurring.subtotal + oneTime.subtotal;

  // Build verification status arrays
  const confirmedPrices: string[] = [];
  const estimatedPrices: string[] = [];
  const requiresVerification: string[] = [];

  [...devItems, ...thirdPartyItems, ...recurringItems, ...oneTimeItems].forEach(item => {
    if (item.verificationStatus === "confirmed") {
      confirmedPrices.push(`${item.name}: $${item.amount}`);
    } else if (item.verificationStatus === "estimate") {
      estimatedPrices.push(`${item.name}: $${item.amount}`);
    } else {
      requiresVerification.push(`${item.name}: $${item.amount} (${item.source})`);
    }
  });

  const assumptions: string[] = [];
  const priceVerificationNotes: string[] = [];

  if (!reqs.budget) {
    assumptions.push("Budget based on estimated project scope, not client-provided budget");
  }
  if (!reqs.clientProvidedBudget) {
    assumptions.push("No client budget provided; estimate is based on scope alone");
  }
  assumptions.push("Third-party costs are estimates and require verification with providers");
  assumptions.push("Recurring costs are monthly estimates; annual costs may differ");
  assumptions.push("AI API usage costs depend heavily on actual usage volume");

  priceVerificationNotes.push("Hosting price requires verification based on actual usage and provider");
  priceVerificationNotes.push("Domain price varies by TLD; check current registrar pricing");
  priceVerificationNotes.push("AI API costs depend on model choice and token usage volume");
  priceVerificationNotes.push("Payment processing fees are per-transaction; estimate based on projected volume");
  priceVerificationNotes.push("CDN/Storage costs scale with traffic and data volume");

  const includedItems = [
    "Full development lifecycle (planning, design, development, testing, deployment)",
    "Project management and communication",
    "Basic SEO setup",
    "Responsive design",
    "Admin dashboard (if requested)",
    "Client dashboard (if requested)",
  ];

  const excludedItems = [
    "Content creation (copywriting, images, videos)",
    "Legal/compliance consulting (GDPR, HIPAA, etc.)",
    "Advanced security audits/penetration testing",
    "Ongoing maintenance and support (post-launch)",
    "Marketing and user acquisition",
    "Custom hardware or infrastructure",
  ];

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
    includedItems,
    excludedItems,
    confirmedPrices,
    estimatedPrices,
    requiresVerification,
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
      topCostDrivers: [],
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

  // Identify top cost drivers
  const allCostItems = [
    ...costs.developmentCost.items,
    ...costs.thirdPartyCosts.items,
    ...costs.recurringCosts.items,
    ...costs.oneTimeCosts.items,
  ];

  const topCostDrivers = allCostItems
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 5)
    .map(item => ({
      name: item.name,
      amount: item.amount,
      percentage: Math.round((item.amount / estimatedTotal) * 100),
    }));

  // Propose reduced milestone if over budget
  let reducedMilestoneProposal: BudgetComparison["reducedMilestoneProposal"] = undefined;
  if (status === "slightly-above" || status === "significantly-above") {
    const coreDevCost = costs.developmentCost.items
      .filter(i => ["Project Management", "UI/UX Design", "Frontend Development", "Backend Development", "Testing & QA", "Deployment & DevOps"].includes(i.category))
      .reduce((sum, item) => sum + item.amount, 0);

    reducedMilestoneProposal = {
      name: "Reduced First Milestone (MVP)",
      description: "Core functionality only - defer advanced features to Phase 2",
      estimatedCost: Math.round(coreDevCost * 0.6),
      deliverables: [
        "Basic project structure and setup",
        "Core UI/UX design for primary pages",
        "Essential frontend implementation",
        "Core backend API and database",
        "Basic authentication (if required)",
        "Testing of core flows",
        "Deployment to staging",
      ],
    };
  }

  return {
    clientBudget: parsedBudget,
    estimatedTotal,
    difference,
    status,
    recommendations,
    topCostDrivers,
    reducedMilestoneProposal,
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
  const deliverables: Array<{
    type: string;
    description: string;
    included: boolean;
    category: "development" | "third-party" | "design" | "testing" | "deployment" | "documentation";
    source: "user-provided" | "agent-recommended" | "assumption" | "standard";
  }> = [
    { type: "Design", description: "UI/UX design and visual concepts", included: true, category: "design", source: "standard" },
    { type: "Frontend", description: "Responsive web application", included: true, category: "development", source: "standard" },
  ];

  if (reqs.apiRequired || type === "web-application" || type === "saas") {
    deliverables.push({ type: "Backend API", description: "Server-side API endpoints", included: true, category: "development" as const, source: "standard" as const });
  }
  if (reqs.dbRequired || type === "web-application" || type === "saas") {
    deliverables.push({ type: "Database", description: "Database design and implementation", included: true, category: "development" as const, source: "standard" as const });
  }
  if (reqs.authRequired || type === "saas") {
    deliverables.push({ type: "Authentication", description: "User authentication system", included: true, category: "development" as const, source: "standard" as const });
  }
  if (reqs.adminDashboard) {
    deliverables.push({ type: "Admin Dashboard", description: "Administration panel", included: true, category: "development" as const, source: "agent-recommended" as const });
  }
  if (reqs.clientDashboard) {
    deliverables.push({ type: "Client Dashboard", description: "Client-facing dashboard", included: true, category: "development" as const, source: "agent-recommended" as const });
  }
  if (type === "ecommerce") {
    deliverables.push({ type: "Payment Integration", description: "Payment processing", included: true, category: "third-party" as const, source: "standard" as const });
    deliverables.push({ type: "Product Management", description: "Product catalog system", included: true, category: "development" as const, source: "standard" as const });
  }
  if (reqs.seoRequired) {
    deliverables.push({ type: "SEO", description: "Search engine optimization", included: true, category: "deployment" as const, source: "agent-recommended" as const });
  }
  deliverables.push({ type: "Testing", description: "Quality assurance and testing", included: true, category: "testing" as const, source: "standard" as const });
  deliverables.push({ type: "Deployment", description: "Production deployment", included: true, category: "deployment" as const, source: "standard" as const });
  deliverables.push({ type: "Documentation", description: "Project documentation", included: true, category: "documentation" as const, source: "standard" as const });

  return deliverables;
}

function determineFirstMilestone(
  reqs: ProductionRequirements,
  budgetEstimate: BudgetEstimate
) {
  const type = reqs.projectType || "website";
  const firstMilestone = budgetEstimate.milestoneBreakdown[0];

  // Determine output type based on project type
  let outputType: "ui-prototype" | "interactive-frontend" | "landing-page" | "dashboard-prototype" | "application-shell" | "feature-demonstration" | "ai-agent-prototype" | "workflow-prototype" | "design-concept" | "technical-poc" = "ui-prototype";

  switch (type) {
    case "website":
    case "landing-page":
    case "portfolio":
    case "blog":
      outputType = "landing-page";
      break;
    case "web-application":
    case "saas":
      outputType = "application-shell";
      break;
    case "ecommerce":
      outputType = "feature-demonstration";
      break;
    case "mobile-app":
      outputType = "design-concept";
      break;
    case "ai-integration":
    case "ai-chatbot":
    case "ai-voice-agent":
    case "machine-learning":
      outputType = "ai-agent-prototype";
      break;
    case "automation":
      outputType = "workflow-prototype";
      break;
    case "dashboard":
    case "crm":
    case "erp":
      outputType = "dashboard-prototype";
      break;
    default:
      outputType = "ui-prototype";
  }

  return {
    name: firstMilestone?.name || "Discovery & Planning",
    description: firstMilestone?.description || "Initial project discovery, requirements analysis, and planning",
    deliverables: firstMilestone?.deliverables || ["Project brief", "Sitemap", "Wireframes", "Technical plan"],
    outputType,
    prototypeGenerated: false,
    previewUrl: null as string | null,
    prototypeHTML: undefined as string | undefined,
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

async function generateFirstMilestonePrototype(
  projectId: string,
  reqs: ProductionRequirements,
  milestone: ReturnType<typeof determineFirstMilestone>,
  budgetEstimate: BudgetEstimate
): Promise<{ success: boolean; previewUrl: string | null; prototypeHTML?: string }> {
  try {
    const demoRequirements = {
      projectType: reqs.projectType || "website",
      projectName: reqs.projectName || `${reqs.clientName}'s Project`,
      clientName: reqs.clientName || "Client",
      clientEmail: reqs.clientEmail || "",
      milestoneIndex: 0,
      milestoneName: milestone.name,
      milestoneDescription: milestone.description,
      deliverables: milestone.deliverables,
      features: reqs.features || [],
      budget: reqs.budget,
      totalBudget: budgetEstimate?.estimatedBudget?.max,
      milestoneAmount: budgetEstimate?.milestoneBreakdown?.[0]?.amount,
      timeline: reqs.timeline,
      designPreferences: reqs.designStyle,
      industry: reqs.industry,
      objective: reqs.objective,
      totalMilestones: budgetEstimate?.milestoneBreakdown?.length || 1,
    };

    // Use the existing demo generator for the first milestone
    const prototypeHTML = generateMilestonePrototype(demoRequirements, projectId);

    // Update project with milestone prototype
    const demoId = `milestone-${Date.now()}`;
    await Project.findByIdAndUpdate(projectId, {
      demoHTML: prototypeHTML,
      demoId,
      $push: {
        milestoneVersions: {
          version: 1,
          milestoneName: milestone.name,
          milestoneIndex: 0,
          previewUrl: `/preview/${demoId}`,
          demoId,
          generatedAt: new Date(),
          requirements: reqs,
          status: "generated" as const,
          generatedBy: "ai" as const,
        },
      },
    });

    // Create preview token
    const token = await createPreviewTokenForProject(projectId);
    if (token) {
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://wall-v.com";
      return { success: true, previewUrl: `${appUrl}/preview/${token}`, prototypeHTML };
    }

    return { success: false, previewUrl: null, prototypeHTML: undefined };
  } catch (error) {
    await logError({
      level: "error",
      message: "Failed to generate first milestone prototype",
      source: "production-workflow",
      stack: error instanceof Error ? error.stack : undefined,
      metadata: { projectId },
    });
    return { success: false, previewUrl: null, prototypeHTML: undefined };
  }
}

async function updateProjectWithMilestonePrototype(
  projectId: string,
  prototypeResult: { previewUrl: string | null; prototypeHTML?: string }
) {
  // The project is already updated in generateFirstMilestonePrototype
  // This is a placeholder for additional updates if needed
  await Project.findByIdAndUpdate(projectId, {
    $set: {
      "milestoneVersions.0.previewUrl": prototypeResult.previewUrl,
    },
  });
}

function generateProductionSummary(
  reqs: ProductionRequirements,
  milestone: ReturnType<typeof determineFirstMilestone>,
  costAnalysis: CostAnalysis
): ProductionResult["productionSummary"] {
  const projectType = reqs.projectType || "website";

  let whatWillBeProduced: ProductionResult["productionSummary"]["whatWillBeProduced"] = "Website";

  switch (projectType) {
    case "web-application":
      whatWillBeProduced = "Web Application";
      break;
    case "mobile-app":
      whatWillBeProduced = "Mobile Application";
      break;
    case "ecommerce":
      whatWillBeProduced = "Ecommerce Store";
      break;
    case "saas":
      whatWillBeProduced = "SaaS Application";
      break;
    case "ai-integration":
    case "ai-chatbot":
    case "ai-voice-agent":
    case "machine-learning":
      whatWillBeProduced = "AI Agent";
      break;
    case "automation":
      whatWillBeProduced = "Automation";
      break;
    case "dashboard":
    case "crm":
    case "erp":
      whatWillBeProduced = "Dashboard";
      break;
    case "api":
      whatWillBeProduced = "API";
      break;
    case "landing-page":
    case "portfolio":
    case "blog":
      whatWillBeProduced = "Website";
      break;
    default:
      whatWillBeProduced = "Digital Product";
  }

  const description = `Wall-V proposes to build a ${whatWillBeProduced.toLowerCase()} ${reqs.objective ? `for ${reqs.objective.toLowerCase()}` : ""} with ${reqs.features?.length || 0} key features including ${reqs.features?.slice(0, 3).join(", ") || "core functionality"}. The project will use ${reqs.technologyPreferences?.join(", ") || "modern web technologies"} and ${reqs.mobileRequired ? "include" : "not include"} mobile support.`;

  const targetOutcome = `A fully functional ${whatWillBeProduced.toLowerCase()} ready for ${milestone.outputType.replace("-", " ")} demonstration in the first milestone, with complete development, testing, and deployment following approval.`;

  return {
    whatWillBeProduced,
    description,
    targetOutcome,
  };
}
