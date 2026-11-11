import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import Project from "@/models/project";
import Preview from "@/models/preview";
import { logError } from "@/lib/error-logger";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  let projectId: string | undefined;
  try {
    const { id } = await params;
    projectId = id;
    await connectToDatabase();

    // Check if this is a valid project
    const project = await Project.findById(id)
      .select("name title description status demoHTML demoId requirements quote client language")
      .lean();

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    // Check if there's an active preview token for this project
    const activePreview = await Preview.findOne({
      projectId: project._id,
      status: "active",
      expiresAt: { $gt: new Date() },
    })
      .select("token")
      .sort({ createdAt: -1 })
      .lean();

    if (activePreview) {
      // Redirect to the secure token-based preview
      return NextResponse.json({
        success: true,
        redirect: `/preview/${activePreview.token}`,
        message: "Please use the secure preview link",
      });
    }

    // No active preview token - return project info without demoHTML
    // The old unauthenticated access is deprecated
    return NextResponse.json({
      success: false,
      error: "No active preview",
      message: "This project does not have an active preview. Please request a new preview link from your project manager.",
      projectId: project._id.toString(),
      projectName: project.name,
    });
  } catch (error) {
    await logError({
      level: "error",
      message: "Error in legacy preview endpoint",
      source: "api/projects/preview/[id]",
      stack: error instanceof Error ? error.stack : undefined,
      metadata: { projectId },
    });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
