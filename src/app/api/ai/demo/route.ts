import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import Project from "@/models/project";
import Preview, { createPreviewToken } from "@/models/preview";
import { generateDemoHTML } from "@/lib/demo-generator";
import { logError } from "@/lib/error-logger";
import { getAuthUser } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const user = await getAuthUser();
    if (!user || !["super-admin", "admin", "manager"].includes(user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { requirements, language = "en" } = body;

    if (!requirements?.projectType || !requirements?.name || !requirements?.email) {
      return NextResponse.json(
        { error: "Project type, name, and email are required" },
        { status: 400 }
      );
    }

    await connectToDatabase();

    const demoId = `demo-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    const projectName = `${requirements.name} - ${(requirements.projectType as string)?.replace(/-/g, " ")}`;
    const slug = projectName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") + `-${Date.now()}`;

    const project = await Project.create({
      name: projectName,
      slug,
      title: projectName,
      description: requirements.description || `Custom ${requirements.projectType} project for ${requirements.name}`,
      client: {
        name: requirements.name,
        email: requirements.email,
      },
      requirements: {
        projectType: requirements.projectType,
        features: requirements.features || [],
        budget: requirements.budget,
        timeline: requirements.timeline,
        designStyle: requirements.designStyle,
      },
      demoId,
      status: "demo",
      language,
      quote: {
        min: parseInt(requirements.budget as string) || 1000,
        max: (parseInt(requirements.budget as string) || 1000) * 2,
        currency: "USD",
      },
    });

    const demoHTML = generateDemoHTML(requirements, project._id.toString());
    project.demoHTML = demoHTML;
    await project.save();

    // Create secure preview token
    const { token: previewToken, tokenHash } = createPreviewToken();
    const previewExpiryMinutes = 5;
    const preview = await Preview.create({
      projectId: project._id,
      token: previewToken,
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
          details: `Created via AI demo endpoint for ${requirements.name}`,
        },
      ],
    });

    return NextResponse.json({
      success: true,
      data: {
        projectId: project._id.toString(),
        demoId,
        previewUrl: `/preview/${preview.token}`,
        checkoutUrl: `/checkout/${project._id}`,
      },
    });
  } catch (error) {
    await logError({
      level: "error",
      message: "Error generating demo via AI",
      source: "api/ai/demo",
      stack: error instanceof Error ? error.stack : undefined,
    });
    return NextResponse.json({ error: "Failed to generate demo" }, { status: 500 });
  }
}
