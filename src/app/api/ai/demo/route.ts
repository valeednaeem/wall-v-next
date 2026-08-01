import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import Project from "@/models/project";
import { generateDemoHTML } from "@/lib/demo-generator";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { requirements, language = "en" } = body;

    if (!requirements?.projectType || !requirements?.name || !requirements?.email) {
      return NextResponse.json(
        { error: "Project type, name, and email are required" },
        { status: 400 }
      );
    }

    await connectToDatabase();

    const projectId = `demo-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    const demoHTML = generateDemoHTML(requirements, projectId);

    const project = await Project.create({
      title: `${requirements.name} - ${(requirements.projectType as string)?.replace(/-/g, " ")}`,
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
      demoHTML,
      demoId: projectId,
      status: "demo",
      language,
      quote: {
        min: parseInt(requirements.budget as string) || 1000,
        max: (parseInt(requirements.budget as string) || 1000) * 2,
        currency: "USD",
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        projectId: project._id.toString(),
        demoId: projectId,
        previewUrl: `/preview/${project._id}`,
        checkoutUrl: `/checkout/${project._id}`,
      },
    });
  } catch (error) {
    console.error("Demo generation error:", error);
    return NextResponse.json({ error: "Failed to generate demo" }, { status: 500 });
  }
}
