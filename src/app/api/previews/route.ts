import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import Preview, { createPreviewToken } from "@/models/preview";
import Project from "@/models/project";
import { getAuthUser } from "@/lib/auth";
import { logError } from "@/lib/error-logger";

const DEFAULT_EXPIRY_MINUTES = 5;
const DEFAULT_MAX_ACCESSES = 10;

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { projectId, milestoneIndex, expiresInMinutes, maxAccesses } = body;

    if (!projectId) {
      return NextResponse.json({ error: "projectId is required" }, { status: 400 });
    }

    await connectToDatabase();

    const project = await Project.findById(projectId).lean();
    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    if (!project.demoHTML) {
      return NextResponse.json({ error: "No demo content available for this project" }, { status: 400 });
    }

    // Generate secure token
    const { token, tokenHash } = createPreviewToken();

    // Calculate expiration
    const expiryMinutes = expiresInMinutes || DEFAULT_EXPIRY_MINUTES;
    const expiresAt = new Date(Date.now() + expiryMinutes * 60 * 1000);

    // Create preview record
    const preview = await Preview.create({
      projectId: project._id,
      milestoneIndex: milestoneIndex ?? undefined,
      token,
      tokenHash,
      status: "active",
      expiresAt,
      accessCount: 0,
      maxAccesses: maxAccesses || DEFAULT_MAX_ACCESSES,
      paymentRequired: true,
      paymentStatus: "unpaid",
      createdBy: undefined, // Will be set if auth is available
      accessLog: [
        {
          timestamp: new Date(),
          event: "PREVIEW_CREATED",
          details: `Preview created for project ${project._id}`,
        },
      ],
    });

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://wall-v.com";

    return NextResponse.json({
      success: true,
      data: {
        previewId: preview._id.toString(),
        token: preview.token,
        previewUrl: `${appUrl}/preview/${preview.token}`,
        expiresAt: preview.expiresAt,
        expiresInMinutes: expiryMinutes,
        projectId: project._id.toString(),
        projectName: project.name,
      },
    });
  } catch (error) {
    await logError({
      level: "error",
      message: "Error creating preview token",
      source: "api/previews",
      stack: error instanceof Error ? error.stack : undefined,
    });
    return NextResponse.json({ error: "Failed to create preview" }, { status: 500 });
  }
}
