import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { runProductionWorkflow, type ProductionRequirements } from "@/lib/production-workflow";
import { logError } from "@/lib/error-logger";

/**
 * Development/Test Entry Point
 *
 * This endpoint allows developers to test the complete production workflow
 * without having to replay the entire AI conversation.
 *
 * It accepts a completed requirement object and runs:
 * Requirements → Production Analysis → Cost Detection → First Milestone → Prototype → Preview → Checkout
 *
 * NOTE: This is a development/testing capability and should not be exposed publicly in production.
 */

export async function POST(request: Request) {
  try {
    // Check if this is a development environment
    if (process.env.NODE_ENV === "production" && !process.env.ALLOW_TEST_WORKFLOW) {
      return NextResponse.json(
        { error: "Test workflow endpoint not available in production" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { requirements, options = {} } = body;

    if (!requirements) {
      return NextResponse.json(
        { error: "Requirements object is required" },
        { status: 400 }
      );
    }

    // Validate required fields
    const requiredFields = ["projectType", "clientName", "clientEmail"];
    for (const field of requiredFields) {
      if (!requirements[field]) {
        return NextResponse.json(
          { error: `Missing required field: ${field}` },
          { status: 400 }
        );
      }
    }

    await connectToDatabase();

    // Run the full production workflow
    const result = await runProductionWorkflow(requirements as ProductionRequirements, {
      skipPreview: options.skipPreview || false,
      skipDemo: options.skipDemo || false,
      existingProjectId: options.existingProjectId || undefined,
    });

    return NextResponse.json({
      success: true,
      message: "Production workflow completed successfully",
      result,
    });
  } catch (error) {
    const err = error as Error;
    await logError({
      level: "error",
      message: `Test workflow error: ${err.message}`,
      stack: err.stack,
      source: "test-workflow",
      operation: "POST /api/ai/test-workflow",
    });

    return NextResponse.json(
      {
        success: false,
        error: err.message || "Failed to run test workflow",
        stack: process.env.NODE_ENV !== "production" ? err.stack : undefined,
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  // Return test cases for different project types
  const testCases = {
    "test-a-simple-website": {
      name: "Test A — Simple Website",
      description: "Small business website with Home, About, Services, Contact pages",
      requirements: {
        projectType: "website",
        projectName: "Acme Corp Website",
        clientName: "John Smith",
        clientEmail: "john@acme.com",
        clientPhone: "+1-555-0123",
        clientCompany: "Acme Corporation",
        objective: "Create a professional website for our small business",
        businessPurpose: "Showcase services and generate leads",
        industry: "Professional Services",
        targetAudience: "Small business owners and entrepreneurs",
        features: ["Responsive design", "Contact form", "SEO optimization", "Blog section"],
        requiredPages: ["Home", "About", "Services", "Contact", "Blog"],
        technologyPreferences: ["Next.js", "Tailwind CSS", "Vercel"],
        integrations: [],
        authRequired: false,
        dbRequired: false,
        adminDashboard: false,
        clientDashboard: false,
        apiRequired: false,
        seoRequired: true,
        securityLevel: "standard",
        mobileRequired: true,
        hostingRequired: true,
        specialRequirements: [],
        budget: "15000",
        timeline: "6-8 weeks",
        expectedTimeline: "6-8 weeks",
        clientProvidedBudget: "15000",
      },
    },
    "test-b-ecommerce": {
      name: "Test B — Ecommerce Store",
      description: "Online store with products, categories, cart, checkout, customer accounts, admin dashboard",
      requirements: {
        projectType: "ecommerce",
        projectName: "StyleShop Online Store",
        clientName: "Sarah Johnson",
        clientEmail: "sarah@styleshop.com",
        clientPhone: "+1-555-0456",
        clientCompany: "StyleShop LLC",
        objective: "Build a complete ecommerce platform for fashion retail",
        businessPurpose: "Sell clothing and accessories online with full inventory management",
        industry: "Retail / Fashion",
        targetAudience: "Fashion-conscious consumers aged 18-45",
        features: [
          "Product catalog with categories",
          "Shopping cart and checkout",
          "Customer accounts and order history",
          "Admin dashboard for inventory/orders",
          "Payment integration (Stripe)",
          "Email notifications",
          "Inventory management",
          "Discount codes and promotions",
        ],
        requiredPages: [
          "Home",
          "Shop/Products",
          "Product Detail",
          "Category Pages",
          "Cart",
          "Checkout",
          "Account Dashboard",
          "Order History",
          "Admin Dashboard",
        ],
        technologyPreferences: ["Next.js", "PostgreSQL", "Prisma", "Stripe", "Vercel"],
        integrations: ["Stripe", "SendGrid", "ShipStation", "Google Analytics"],
        authRequired: true,
        dbRequired: true,
        adminDashboard: true,
        clientDashboard: true,
        apiRequired: true,
        seoRequired: true,
        securityLevel: "high",
        mobileRequired: true,
        hostingRequired: true,
        specialRequirements: ["PCI compliance", "GDPR compliance"],
        budget: "75000",
        timeline: "12-16 weeks",
        expectedTimeline: "12-16 weeks",
        clientProvidedBudget: "75000",
      },
    },
    "test-c-saas": {
      name: "Test C — SaaS Application",
      description: "SaaS application with authentication, subscription, user dashboard, admin dashboard, database, API",
      requirements: {
        projectType: "saas",
        projectName: "TaskFlow Pro",
        clientName: "Michael Chen",
        clientEmail: "michael@taskflow.io",
        clientPhone: "+1-555-0789",
        clientCompany: "TaskFlow Inc.",
        objective: "Build a project management SaaS for remote teams",
        businessPurpose: "Help remote teams collaborate with task management, time tracking, and reporting",
        industry: "SaaS / Productivity Software",
        targetAudience: "Remote teams, project managers, small to medium businesses",
        features: [
          "User authentication (email/password, OAuth)",
          "Subscription billing (Stripe)",
          "Project and task management",
          "Team collaboration",
          "Time tracking",
          "Reports and analytics",
          "User dashboard",
          "Admin dashboard",
          "REST API for integrations",
          "Webhooks",
          "Multi-tenancy",
        ],
        requiredPages: [
          "Landing Page",
          "Pricing",
          "Login/Signup",
          "User Dashboard",
          "Project View",
          "Task Board",
          "Reports",
          "Settings",
          "Admin Dashboard",
          "API Documentation",
        ],
        technologyPreferences: ["Next.js", "PostgreSQL", "Prisma", "NextAuth.js", "Stripe", "tRPC", "Vercel"],
        integrations: ["Stripe", "GitHub", "Slack", "Jira", "Google Calendar"],
        authRequired: true,
        dbRequired: true,
        adminDashboard: true,
        clientDashboard: true,
        apiRequired: true,
        seoRequired: true,
        securityLevel: "high",
        mobileRequired: true,
        hostingRequired: true,
        specialRequirements: ["SOC 2 compliance", "Multi-region deployment"],
        budget: "150000",
        timeline: "20-24 weeks",
        expectedTimeline: "20-24 weeks",
        clientProvidedBudget: "150000",
      },
    },
    "test-d-ai-application": {
      name: "Test D — AI Application",
      description: "AI-powered application with chat interface, AI model, knowledge base, user accounts, usage tracking",
      requirements: {
        projectType: "ai-integration",
        projectName: "SupportBot AI",
        clientName: "Emily Rodriguez",
        clientEmail: "emily@supportbot.ai",
        clientPhone: "+1-555-0321",
        clientCompany: "SupportBot Inc.",
        objective: "Build an AI-powered customer support chatbot with knowledge base",
        businessPurpose: "Automate customer support with AI that can answer questions from documentation",
        industry: "AI / Customer Support",
        targetAudience: "SaaS companies, e-commerce businesses, support teams",
        features: [
          "AI chat interface",
          "Knowledge base integration",
          "Vector database for embeddings",
          "Conversation history",
          "User accounts and authentication",
          "Usage tracking and analytics",
          "Admin dashboard for training data",
          "Human handoff capability",
          "Multi-language support",
          "API for widget embedding",
        ],
        requiredPages: [
          "Landing Page",
          "Pricing",
          "Login/Signup",
          "Chat Interface",
          "Knowledge Base Management",
          "Analytics Dashboard",
          "Admin Panel",
          "Widget Embed Code",
          "API Documentation",
        ],
        technologyPreferences: ["Next.js", "PostgreSQL", "Pinecone/Weaviate", "OpenAI API", "LangChain", "NextAuth.js", "Vercel"],
        integrations: ["OpenAI", "Anthropic", "Pinecone", "Intercom", "Zendesk", "Slack"],
        authRequired: true,
        dbRequired: true,
        adminDashboard: true,
        clientDashboard: true,
        apiRequired: true,
        seoRequired: true,
        securityLevel: "high",
        mobileRequired: true,
        hostingRequired: true,
        specialRequirements: ["Data privacy compliance", "Token usage monitoring", "Rate limiting"],
        budget: "100000",
        timeline: "16-20 weeks",
        expectedTimeline: "16-20 weeks",
        clientProvidedBudget: "100000",
      },
    },
    "test-e-mobile-app": {
      name: "Test E — Mobile Application",
      description: "Mobile application with authentication, API, push notifications, user dashboard, app store deployment",
      requirements: {
        projectType: "mobile-app",
        projectName: "FitTrack Mobile",
        clientName: "David Park",
        clientEmail: "david@fittrack.app",
        clientPhone: "+1-555-0654",
        clientCompany: "FitTrack Inc.",
        objective: "Build a cross-platform fitness tracking mobile app",
        businessPurpose: "Help users track workouts, nutrition, and progress with social features",
        industry: "Health & Fitness / Mobile Apps",
        targetAudience: "Fitness enthusiasts, gym-goers, health-conscious individuals",
        features: [
          "User authentication (email, social login)",
          "Workout tracking and logging",
          "Nutrition/meal tracking",
          "Progress photos and measurements",
          "Push notifications for reminders",
          "Social features (friends, challenges)",
          "Apple Health / Google Fit integration",
          "Offline mode with sync",
          "Subscription for premium features",
          "Admin dashboard for content management",
        ],
        requiredPages: [
          "Onboarding",
          "Login/Signup",
          "Home Dashboard",
          "Workout Logger",
          "Nutrition Tracker",
          "Progress Tracking",
          "Social Feed",
          "Challenges",
          "Settings",
          "Subscription Management",
          "Admin Dashboard (web)",
        ],
        technologyPreferences: ["React Native / Expo", "TypeScript", "PostgreSQL", "Supabase", "Expo Push", "RevenueCat", "Vercel (web admin)"],
        integrations: ["Apple HealthKit", "Google Fit", "RevenueCat", "Supabase", "Expo Push Notifications"],
        authRequired: true,
        dbRequired: true,
        adminDashboard: true,
        clientDashboard: false,
        apiRequired: true,
        seoRequired: false,
        securityLevel: "high",
        mobileRequired: true,
        hostingRequired: true,
        specialRequirements: ["App Store deployment (iOS/Android)", "TestFlight/Play Console setup", "HIPAA considerations for health data"],
        budget: "120000",
        timeline: "18-22 weeks",
        expectedTimeline: "18-22 weeks",
        clientProvidedBudget: "120000",
      },
    },
  };

  return NextResponse.json({
    message: "Test workflow endpoint - use POST to run workflow with a test case",
    testCases,
    usage: {
      method: "POST",
      body: {
        requirements: "One of the testCases objects above, or custom requirements",
        options: {
          skipPreview: "boolean (optional)",
          skipDemo: "boolean (optional)",
          existingProjectId: "string (optional)",
        },
      },
    },
  });
}