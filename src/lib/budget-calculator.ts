/**
 * Wall-V Budget Calculator
 *
 * Calculates project budgets from ServicePrice data and project requirements.
 * Used by AI agents, project summary, and checkout flows.
 */

import { connectToDatabase } from "@/lib/mongodb";
import ServicePrice, { type IServicePrice } from "@/models/service-price";
import type { ProjectBrief } from "./project-discovery";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface MilestoneBreakdown {
  name: string;
  description: string;
  amount: number;
  percentage: number;
  deliverables: string[];
  status: "pending";
  dueDate?: string;
}

export interface BudgetEstimate {
  estimatedBudget: {
    min: number;
    max: number;
    currency: string;
  };
  milestoneBreakdown: MilestoneBreakdown[];
  confidenceLevel: "high" | "medium" | "low";
  assumptions: string[];
  includedServices: { name: string; description: string; cost: number }[];
  optionalServices: { name: string; description: string; cost: number; recommended: boolean }[];
  timeline: { min: number; max: number; unit: "weeks" | "months" };
}

// ─── Milestone Templates ────────────────────────────────────────────────────

const MILESTONE_TEMPLATES: Record<string, { name: string; description: string; percentage: number; deliverables: string[] }[]> = {
  website: [
    { name: "Discovery & Planning", description: "Requirements gathering, sitemap, wireframes", percentage: 15, deliverables: ["Project brief", "Sitemap", "Wireframes", "Technology stack selection"] },
    { name: "Design", description: "UI/UX design, brand integration, responsive layouts", percentage: 20, deliverables: ["Design mockups", "Style guide", "Responsive layouts", "Client approval"] },
    { name: "Development", description: "Frontend and backend implementation", percentage: 35, deliverables: ["Working website", "CMS integration", "Contact forms", "Mobile responsive"] },
    { name: "Content & SEO", description: "Content creation, SEO optimization, meta tags", percentage: 15, deliverables: ["Page content", "SEO meta tags", "Analytics setup", "Speed optimization"] },
    { name: "Testing & Launch", description: "QA testing, bug fixes, deployment", percentage: 15, deliverables: ["Cross-browser testing", "Bug fixes", "Domain/hosting setup", "Go-live"] },
  ],
  "web-application": [
    { name: "Discovery & Architecture", description: "Requirements, system architecture, database design", percentage: 15, deliverables: ["Architecture document", "Database schema", "API specification", "Project plan"] },
    { name: "UI/UX Design", description: "Wireframes, prototypes, design system", percentage: 15, deliverables: ["Wireframes", "Design system", "Interactive prototype", "Client approval"] },
    { name: "Core Development", description: "API, database, authentication, core features", percentage: 35, deliverables: ["Authentication system", "Core API", "Database integration", "Admin panel"] },
    { name: "Feature Development", description: "Advanced features, integrations, AI components", percentage: 25, deliverables: ["Advanced features", "Third-party integrations", "AI components", "Performance optimization"] },
    { name: "Testing & Deployment", description: "QA, performance testing, deployment", percentage: 10, deliverables: ["Test suite", "Performance testing", "Deployment", "Documentation"] },
  ],
  ecommerce: [
    { name: "Discovery & Planning", description: "Product catalog, payment flow, user journeys", percentage: 10, deliverables: ["Product catalog plan", "Payment flow", "User journeys", "Requirements"] },
    { name: "Design", description: "Store design, product pages, checkout flow", percentage: 15, deliverables: ["Store design", "Product page layouts", "Checkout flow", "Mobile design"] },
    { name: "Development", description: "Store setup, product management, payments", percentage: 40, deliverables: ["Product management", "Cart system", "Payment integration", "Order management"] },
    { name: "Content & Products", description: "Product listings, descriptions, images", percentage: 20, deliverables: ["Product listings", "Descriptions", "Image optimization", "SEO setup"] },
    { name: "Testing & Launch", description: "Payment testing, QA, go-live", percentage: 15, deliverables: ["Payment testing", "QA testing", "Performance testing", "Go-live"] },
  ],
  "mobile-app": [
    { name: "Discovery & Planning", description: "Requirements, platform choice, app architecture", percentage: 15, deliverables: ["Requirements doc", "Platform selection", "App architecture", "Project plan"] },
    { name: "UI/UX Design", description: "App wireframes, design system, prototypes", percentage: 15, deliverables: ["Wireframes", "Design system", "Interactive prototype", "Client approval"] },
    { name: "Core Development", description: "App development, API integration", percentage: 40, deliverables: ["Core app", "API integration", "User authentication", "Data sync"] },
    { name: "Features & Polish", description: "Advanced features, animations, offline support", percentage: 20, deliverables: ["Advanced features", "Animations", "Offline support", "Push notifications"] },
    { name: "Testing & Release", description: "QA, App Store submission, launch", percentage: 10, deliverables: ["QA testing", "App Store submission", "Launch", "Documentation"] },
  ],
  "ai-integration": [
    { name: "Discovery & Design", description: "AI use case analysis, model selection, architecture", percentage: 15, deliverables: ["AI use case analysis", "Model selection", "Architecture design", "Data requirements"] },
    { name: "Data & Training", description: "Data preparation, model training, fine-tuning", percentage: 25, deliverables: ["Data pipeline", "Training data", "Model training", "Fine-tuning"] },
    { name: "Integration", description: "API development, UI integration, testing", percentage: 30, deliverables: ["AI API", "UI integration", "Testing suite", "Performance optimization"] },
    { name: "Optimization", description: "Performance tuning, accuracy improvement", percentage: 15, deliverables: ["Performance tuning", "Accuracy improvement", "Cost optimization", "Monitoring"] },
    { name: "Deployment", description: "Production deployment, monitoring setup", percentage: 15, deliverables: ["Production deployment", "Monitoring", "Documentation", "Training"] },
  ],
  crm: [
    { name: "Requirements & Design", description: "CRM workflow mapping, UI design", percentage: 15, deliverables: ["Workflow mapping", "UI design", "Data model", "Requirements"] },
    { name: "Core CRM Build", description: "Contact management, pipeline, dashboards", percentage: 35, deliverables: ["Contact management", "Pipeline tracking", "Dashboard", "Reporting"] },
    { name: "Integrations", description: "Email, calendar, third-party integrations", percentage: 25, deliverables: ["Email integration", "Calendar sync", "Third-party APIs", "Data import"] },
    { name: "Training & Launch", description: "User training, data migration, deployment", percentage: 25, deliverables: ["User training", "Data migration", "Go-live support", "Documentation"] },
  ],
  erp: [
    { name: "Planning & Architecture", description: "Module selection, system architecture", percentage: 10, deliverables: ["Module plan", "Architecture", "Data model", "Project plan"] },
    { name: "Core Modules", description: "Finance, HR, inventory core modules", percentage: 35, deliverables: ["Finance module", "HR module", "Inventory module", "Core dashboard"] },
    { name: "Integrations & Customization", description: "Third-party integrations, custom workflows", percentage: 30, deliverables: ["Integrations", "Custom workflows", "Reporting", "Automation"] },
    { name: "Testing & Training", description: "UAT, training, data migration", percentage: 15, deliverables: ["UAT testing", "User training", "Data migration", "Go-live"] },
    { name: "Deployment & Support", description: "Production deployment, ongoing support", percentage: 10, deliverables: ["Deployment", "Monitoring", "Support plan", "Documentation"] },
  ],
  "ai-chatbot": [
    { name: "Discovery & Training Data", description: "Use case analysis, knowledge base setup", percentage: 15, deliverables: ["Use case analysis", "Knowledge base", "Conversation flows", "Training data"] },
    { name: "Bot Development", description: "NLP configuration, conversation flows", percentage: 35, deliverables: ["NLP configuration", "Conversation logic", "Intent recognition", "Response templates"] },
    { name: "Integration", description: "Website/channel integration, testing", percentage: 25, deliverables: ["Channel integration", "Testing", "Performance tuning", "Analytics setup"] },
    { name: "Optimization & Launch", description: "Performance tuning, monitoring, deployment", percentage: 25, deliverables: ["Performance tuning", "Monitoring", "Go-live", "Documentation"] },
  ],
  default: [
    { name: "Discovery & Planning", description: "Requirements gathering and project planning", percentage: 15, deliverables: ["Requirements document", "Project plan", "Wireframes", "Client approval"] },
    { name: "Design", description: "UI/UX design and prototyping", percentage: 20, deliverables: ["Design mockups", "Prototype", "Style guide", "Client approval"] },
    { name: "Development", description: "Core implementation", percentage: 35, deliverables: ["Core features", "Integration", "Testing", "Documentation"] },
    { name: "Testing", description: "Quality assurance and bug fixes", percentage: 15, deliverables: ["Test reports", "Bug fixes", "Performance testing", "Security review"] },
    { name: "Launch", description: "Deployment and go-live", percentage: 15, deliverables: ["Deployment", "Domain/hosting setup", "Go-live", "Support handoff"] },
  ],
};

// ─── Complexity Multipliers ─────────────────────────────────────────────────

const COMPLEXITY_MULTIPLIERS: Record<string, number> = {
  low: 0.8,
  medium: 1.0,
  high: 1.3,
  unknown: 1.0,
};

// ─── Feature Cost Map ───────────────────────────────────────────────────────

const FEATURE_ADDONS: Record<string, number> = {
  "user authentication": 200,
  authentication: 200,
  "payment integration": 300,
  payments: 300,
  "real-time notifications": 250,
  "ai features": 500,
  "ai": 500,
  "machine learning": 800,
  "push notifications": 150,
  "offline support": 200,
  "multi-language": 300,
  "analytics": 150,
  "seo": 200,
  "social media integration": 150,
  "email automation": 200,
  "calendar integration": 150,
  "file upload": 100,
  "search functionality": 150,
  "reporting": 250,
  "dashboard": 300,
  "admin panel": 350,
  "api integration": 200,
  "third-party integration": 200,
  "database design": 200,
  "cloud deployment": 200,
  "ssl certificate": 50,
  "cdn": 100,
  "performance optimization": 200,
  "security audit": 250,
  "testing": 300,
  "documentation": 150,
  "training": 200,
  "support": 100,
  "maintenance": 150,
  "hosting setup": 100,
  "domain setup": 50,
  "responsive design": 0,
  "mobile responsive": 0,
  "content management": 200,
  "cms": 200,
};

// ─── Service Key Mapping ────────────────────────────────────────────────────

const PROJECT_TYPE_TO_SERVICE_KEY: Record<string, string> = {
  website: "web-development",
  "web-application": "web-development",
  "web-app": "web-development",
  ecommerce: "web-development",
  "e-commerce": "web-development",
  "mobile-app": "mobile-applications",
  "mobile application": "mobile-applications",
  "ai-integration": "ai-automation",
  "ai-chatbot": "ai-automation",
  "ai-voice-agent": "ai-automation",
  "ai-automation": "ai-automation",
  crm: "crm-systems",
  erp: "erp-systems",
  "erp-crm": "erp-systems",
  "seo-marketing": "digital-marketing",
  "digital-marketing": "digital-marketing",
  design: "ui-ux-design",
  "ui-ux": "ui-ux-design",
  branding: "ui-ux-design",
  hosting: "web-hosting",
  domains: "domain-registration",
  consulting: "consulting",
  saas: "web-development",
  automation: "ai-automation",
  "digital-product": "web-development",
  redesign: "web-development",
};

// ─── Main Calculator ────────────────────────────────────────────────────────

export async function calculateBudget(params: {
  projectType?: string;
  features?: string[];
  complexity?: string;
  budget?: string;
  timeline?: string;
  brief?: ProjectBrief;
}): Promise<BudgetEstimate> {
  const {
    projectType = "website",
    features = [],
    complexity = "medium",
    budget: budgetRange,
    timeline,
    brief,
  } = params;

  // Load service prices from database
  let servicePrices: IServicePrice[] = [];
  try {
    await connectToDatabase();
    servicePrices = await ServicePrice.find({ active: true }).lean();
  } catch {
    // Fallback to hardcoded data
  }

  // Get base price from ServicePrice or fallback
  const serviceKey = PROJECT_TYPE_TO_SERVICE_KEY[projectType] || "web-development";
  const dbPrice = servicePrices.find(
    (sp) => sp.serviceKey === serviceKey || sp.serviceKey.includes(serviceKey.split("-")[0])
  );

  let basePrice = 0;
  if (dbPrice) {
    if (dbPrice.type === "tiered" && dbPrice.tiers?.length) {
      basePrice = dbPrice.tiers[0].price;
    } else {
      basePrice = dbPrice.basePrice;
    }
  } else {
    // Fallback hardcoded prices
    const fallbackPrices: Record<string, number> = {
      website: 1500,
      "web-application": 3000,
      ecommerce: 2500,
      "mobile-app": 5000,
      "ai-integration": 3000,
      "ai-chatbot": 2000,
      "ai-voice-agent": 2500,
      crm: 3000,
      erp: 5000,
      design: 1500,
      "seo-marketing": 1000,
      hosting: 100,
      consulting: 1500,
      saas: 5000,
      automation: 2500,
    };
    basePrice = fallbackPrices[projectType] || 1500;
  }

  // Calculate feature addons
  let featureCost = 0;
  const matchedFeatures: string[] = [];
  for (const feature of features) {
    const featureLower = feature.toLowerCase();
    for (const [key, cost] of Object.entries(FEATURE_ADDONS)) {
      if (featureLower.includes(key) || key.includes(featureLower)) {
        featureCost += cost;
        matchedFeatures.push(feature);
        break;
      }
    }
  }

  // Apply complexity multiplier
  const multiplier = COMPLEXITY_MULTIPLIERS[complexity] || 1.0;
  const subtotal = Math.round((basePrice + featureCost) * multiplier);

  // Determine budget range from text if provided
  let budgetMin = subtotal;
  let budgetMax = Math.round(subtotal * 1.4);

  if (budgetRange) {
    const parsed = parseBudgetRange(budgetRange);
    if (parsed.min > 0 && parsed.max > 0) {
      budgetMin = parsed.min;
      budgetMax = parsed.max;
    } else if (parsed.min > 0) {
      budgetMin = parsed.min;
      budgetMax = Math.round(parsed.min * 1.3);
    }
  }

  // Generate milestone breakdown
  const template = MILESTONE_TEMPLATES[projectType] || MILESTONE_TEMPLATES.default;
  const milestoneBreakdown: MilestoneBreakdown[] = template.map((m) => ({
    name: m.name,
    description: m.description,
    amount: Math.round(budgetMin * (m.percentage / 100)),
    percentage: m.percentage,
    deliverables: m.deliverables,
    status: "pending" as const,
  }));

  // Build assumptions list
  const assumptions: string[] = [];
  if (!budgetRange) {
    assumptions.push("Budget estimated based on project type and complexity (no client budget provided)");
  }
  if (complexity === "unknown" || !complexity) {
    assumptions.push("Project complexity assumed to be medium");
  }
  if (features.length === 0) {
    assumptions.push("Standard feature set assumed");
  }
  if (timeline && !timeline.includes("week") && !timeline.includes("month")) {
    assumptions.push("Timeline interpreted from description");
  }

  // Build included services
  const includedServices = [
    { name: "Project Management", description: "Planning, coordination, and delivery management", cost: Math.round(subtotal * 0.1) },
    { name: "Quality Assurance", description: "Testing, bug fixes, and quality validation", cost: Math.round(subtotal * 0.1) },
    { name: "Deployment", description: "Production deployment and go-live support", cost: Math.round(subtotal * 0.05) },
  ];

  // Build optional services
  const optionalServices = [
    { name: "Extended Support", description: "3 months post-launch support and maintenance", cost: Math.round(subtotal * 0.15), recommended: false },
    { name: "SEO Package", description: "Full SEO setup with keyword research and optimization", cost: 500, recommended: features.some((f) => f.toLowerCase().includes("seo")) },
    { name: "Content Creation", description: "Professional copywriting for all pages", cost: 800, recommended: false },
    { name: "Analytics Dashboard", description: "Custom analytics and reporting dashboard", cost: 400, recommended: features.some((f) => f.toLowerCase().includes("analytics")) },
  ];

  // Timeline estimation
  const timelineMin = dbPrice?.estimatedWeeks?.min || Math.max(2, Math.ceil(subtotal / 1000));
  const timelineMax = dbPrice?.estimatedWeeks?.max || Math.max(timelineMin + 2, Math.ceil(subtotal / 700));

  // Confidence level
  let confidenceLevel: "high" | "medium" | "low" = "medium";
  if (dbPrice && features.length > 0 && budgetRange) {
    confidenceLevel = "high";
  } else if (!dbPrice && features.length === 0) {
    confidenceLevel = "low";
  }

  return {
    estimatedBudget: {
      min: budgetMin,
      max: budgetMax,
      currency: "USD",
    },
    milestoneBreakdown,
    confidenceLevel,
    assumptions,
    includedServices,
    optionalServices,
    timeline: {
      min: timelineMin,
      max: timelineMax,
      unit: "weeks",
    },
  };
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function parseBudgetRange(text: string): { min: number; max: number } {
  const cleaned = text.replace(/[^0-9.,\-\s]/g, "");
  
  // Try range pattern: "1000-5000" or "1000 - 5000" or "$1,000 - $5,000"
  const rangeMatch = cleaned.match(/(\d[\d,]*)\s*[-–]\s*(\d[\d,]*)/);
  if (rangeMatch) {
    return {
      min: parseInt(rangeMatch[1].replace(/,/g, "")) || 0,
      max: parseInt(rangeMatch[2].replace(/,/g, "")) || 0,
    };
  }

  // Try single number: "3000" or "$3,000"
  const singleMatch = cleaned.match(/(\d[\d,]*)/);
  if (singleMatch) {
    const val = parseInt(singleMatch[1].replace(/,/g, "")) || 0;
    return { min: val, max: 0 };
  }

  // Try text ranges
  const textRanges: Record<string, { min: number; max: number }> = {
    "small": { min: 500, max: 1500 },
    "medium": { min: 1500, max: 5000 },
    "large": { min: 5000, max: 15000 },
    "enterprise": { min: 15000, max: 50000 },
    "low": { min: 500, max: 1500 },
    "high": { min: 5000, max: 15000 },
  };

  const lower = text.toLowerCase();
  for (const [key, range] of Object.entries(textRanges)) {
    if (lower.includes(key)) return range;
  }

  return { min: 0, max: 0 };
}

/**
 * Generate a concise budget summary string for AI agents.
 */
export function formatBudgetSummary(estimate: BudgetEstimate): string {
  const { estimatedBudget, milestoneBreakdown, timeline, confidenceLevel } = estimate;

  const lines = [
    `Estimated Budget: $${estimatedBudget.min.toLocaleString()} - $${estimatedBudget.max.toLocaleString()} ${estimatedBudget.currency}`,
    `Timeline: ${timeline.min}-${timeline.max} ${timeline.unit}`,
    `Confidence: ${confidenceLevel}`,
    "",
    "Milestones:",
  ];

  for (let i = 0; i < milestoneBreakdown.length; i++) {
    const m = milestoneBreakdown[i];
    lines.push(`  ${i + 1}. ${m.name} — $${m.amount.toLocaleString()} (${m.percentage}%)`);
    lines.push(`     Deliverables: ${m.deliverables.join(", ")}`);
  }

  return lines.join("\n");
}
