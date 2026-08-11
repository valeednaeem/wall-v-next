import { NextResponse } from "next/server";
import { runProductionWorkflow, type ProductionRequirements } from "@/lib/production-workflow";
import { sendEmail, projectCreatedEmail, adminNewProjectEmail } from "@/services/email";
import { notifyAdmins } from "@/lib/notify";
import { logError } from "@/lib/error-logger";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const {
      name,
      description,
      clientName,
      clientEmail,
      clientPhone,
      clientCompany,
      projectType,
      features,
      budget,
      timeline,
      designStyle,
      language,
      estimatedQuote,
      objective,
      industry,
      targetAudience,
      integrations,
      pages,
      authRequired,
      dbRequired,
      adminDashboard,
      clientDashboard,
      apiRequired,
      seoRequired,
      mobileRequired,
    } = body;

    if (!name || !clientName || !clientEmail) {
      return NextResponse.json(
        { error: "name, clientName, and clientEmail are required" },
        { status: 400 }
      );
    }

    // Build requirements object
    const requirements: ProductionRequirements = {
      projectType: projectType || "website",
      projectName: name,
      clientName,
      clientEmail,
      clientPhone,
      clientCompany,
      features: features || [],
      budget: budget || estimatedQuote ? `$${estimatedQuote?.min || 0}-${estimatedQuote?.max || 0}` : undefined,
      timeline,
      designStyle,
      language: language || "en",
      objective,
      industry,
      targetAudience,
      integrations,
      pages,
      authRequired,
      dbRequired,
      adminDashboard,
      clientDashboard,
      apiRequired,
      seoRequired,
      mobileRequired,
    };

    // Run the unified production workflow
    const result = await runProductionWorkflow(requirements);

    // Send email notifications (non-blocking)
    if (clientEmail) {
      const clientEmailData = projectCreatedEmail(
        result.projectName,
        clientName,
        result.previewUrl || result.checkoutUrl
      );
      sendEmail({ ...clientEmailData, to: clientEmail }).catch(() => {});
    }
    const adminEmailData = adminNewProjectEmail(
      result.projectName,
      clientName,
      result.projectType,
      budget || "TBD"
    );
    sendEmail({ ...adminEmailData, to: process.env.ADMIN_EMAIL || "admin@wall-v.com" }).catch(() => {});
    notifyAdmins(
      "New Project Created",
      `"${result.projectName}" was created by AI agent`,
      "success",
      `/dashboard/projects/${result.projectId}/edit`
    ).catch(() => {});

    return NextResponse.json({
      success: true,
      project: {
        id: result.projectId,
        name: result.projectName,
        status: result.status,
        deliverables: result.deliverables,
        firstMilestone: result.firstMilestone,
        costAnalysis: result.costAnalysis,
        budgetComparison: result.budgetComparison,
        checkoutUrl: result.checkoutUrl,
        previewUrl: result.previewUrl,
      },
    }, { status: 201 });
  } catch (error) {
    await logError({
      level: "error",
      message: "Error creating project via production workflow",
      source: "api/ai/create-project",
      stack: error instanceof Error ? error.stack : undefined,
    });
    return NextResponse.json(
      { error: "Failed to create project" },
      { status: 500 }
    );
  }
}
