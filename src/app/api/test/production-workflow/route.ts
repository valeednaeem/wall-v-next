import { NextResponse } from "next/server";
import { runProductionWorkflow, type ProductionRequirements } from "@/lib/production-workflow";
import { logError } from "@/lib/error-logger";

const TEST_SCENARIOS: Record<string, ProductionRequirements> = {
  "simple-website": {
    projectType: "website",
    projectName: "Business Landing Page",
    clientName: "Test Client",
    clientEmail: "test@example.com",
    features: ["contact-form", "seo-optimization", "responsive-design"],
    budget: "$500-1500",
    timeline: "2 weeks",
    designStyle: "modern",
    language: "en",
    objective: "Create a professional landing page for a local business",
    industry: "Professional Services",
    targetAudience: "Local customers",
    pages: ["home", "about", "services", "contact"],
    seoRequired: true,
    mobileRequired: true,
  },
  ecommerce: {
    projectType: "ecommerce",
    projectName: "Fashion Store",
    clientName: "Test Client",
    clientEmail: "test@example.com",
    features: ["product-catalog", "shopping-cart", "payment-gateway", "user-accounts", "order-tracking", "admin-dashboard"],
    budget: "$3000-8000",
    timeline: "6 weeks",
    designStyle: "fashion-forward",
    language: "en",
    objective: "Build an online fashion store with inventory management",
    industry: "Fashion & Retail",
    targetAudience: "Young adults 18-35",
    pages: ["home", "shop", "product-detail", "cart", "checkout", "account", "admin"],
    authRequired: true,
    dbRequired: true,
    adminDashboard: true,
    seoRequired: true,
    mobileRequired: true,
    integrations: ["stripe", "shipping-api"],
  },
  saas: {
    projectType: "web-application",
    projectName: "Project Management SaaS",
    clientName: "Test Client",
    clientEmail: "test@example.com",
    features: ["user-auth", "project-management", "task-tracking", "team-collaboration", "file-uploads", "notifications", "analytics-dashboard", "api-integration"],
    budget: "$15000-30000",
    timeline: "12 weeks",
    designStyle: "clean-professional",
    language: "en",
    objective: "Build a SaaS project management tool competing with Trello",
    industry: "Software & Technology",
    targetAudience: "Small to medium businesses",
    pages: ["dashboard", "projects", "tasks", "team", "settings", "billing", "reports"],
    authRequired: true,
    dbRequired: true,
    adminDashboard: true,
    clientDashboard: true,
    apiRequired: true,
    seoRequired: true,
    mobileRequired: true,
    integrations: ["stripe", "google-auth", "slack", "email-service"],
  },
  "ai-app": {
    projectType: "ai-integration",
    projectName: "AI Customer Support Bot",
    clientName: "Test Client",
    clientEmail: "test@example.com",
    features: ["chat-interface", "knowledge-base", "intent-recognition", "escalation-to-human", "analytics", "multi-language"],
    budget: "$20000-40000",
    timeline: "16 weeks",
    designStyle: "modern-minimal",
    language: "en",
    objective: "Build an AI chatbot that handles 80% of customer support queries",
    industry: "Customer Service",
    targetAudience: "E-commerce customers",
    authRequired: true,
    dbRequired: true,
    adminDashboard: true,
    apiRequired: true,
    integrations: ["openai-api", "crm-system", "email-service", "zendesk"],
  },
  mobile: {
    projectType: "mobile-app",
    projectName: "Fitness Tracking App",
    clientName: "Test Client",
    clientEmail: "test@example.com",
    features: ["workout-tracking", "nutrition-logging", "progress-charts", "social-features", "push-notifications", "offline-support"],
    budget: "$25000-50000",
    timeline: "20 weeks",
    designStyle: "energetic-modern",
    language: "en",
    objective: "Build a cross-platform fitness app with social features",
    industry: "Health & Fitness",
    targetAudience: "Fitness enthusiasts 20-45",
    authRequired: true,
    dbRequired: true,
    clientDashboard: true,
    apiRequired: true,
    mobileRequired: true,
    integrations: ["apple-health", "google-fit", "social-login"],
  },
};

export async function GET(request: Request) {
  const url = new URL(request.url);
  const scenario = url.searchParams.get("scenario") || "simple-website";
  const skipPreview = url.searchParams.get("skipPreview") === "true";

  if (scenario === "all") {
    // Run all scenarios
    const results: Record<string, unknown> = {};
    for (const [key, requirements] of Object.entries(TEST_SCENARIOS)) {
      try {
        results[key] = await runProductionWorkflow(requirements, { skipPreview, skipDemo: true });
      } catch (error) {
        results[key] = { error: error instanceof Error ? error.message : "Unknown error" };
      }
    }
    return NextResponse.json({ success: true, results });
  }

  if (!TEST_SCENARIOS[scenario]) {
    return NextResponse.json(
      { error: `Unknown scenario: ${scenario}. Available: ${Object.keys(TEST_SCENARIOS).join(", ")}, all` },
      { status: 400 }
    );
  }

  try {
    const result = await runProductionWorkflow(TEST_SCENARIOS[scenario], { skipPreview });
    return NextResponse.json({ success: true, scenario, result });
  } catch (error) {
    await logError({
      level: "error",
      message: `Test scenario "${scenario}" failed`,
      source: "api/test/production-workflow",
      stack: error instanceof Error ? error.stack : undefined,
    });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Test failed" },
      { status: 500 }
    );
  }
}
