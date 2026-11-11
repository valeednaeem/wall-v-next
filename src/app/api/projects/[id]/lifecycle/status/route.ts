import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import connectToDatabase from "@/lib/mongodb";
import Project from "@/models/project";
import ProjectStage from "@/models/project-stage";
import { canTransitionStatus } from "@/lib/project-lifecycle";
import { logProjectActivity } from "@/lib/activity-logger";

// PUT /api/projects/[id]/lifecycle/status
// Transition project status with validation
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    await connectToDatabase();
    const { id } = await params;
    const { status, lifecycleStatus } = await request.json();

    const project = await Project.findById(id);
    if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });

    const oldStatus = project.status;
    const oldLifecycle = project.lifecycleStatus;

    // Validate status transition
    if (status && status !== oldStatus) {
      if (!canTransitionStatus(oldStatus, status)) {
        const { getValidStatusTransitions } = await import("@/lib/project-lifecycle");
        const valid = getValidStatusTransitions(oldStatus);
        return NextResponse.json({
          error: `Cannot transition from "${oldStatus}" to "${status}"`,
          validTransitions: valid,
        }, { status: 400 });
      }
      project.status = status;
    }

    // Update lifecycle status
    if (lifecycleStatus && lifecycleStatus !== oldLifecycle) {
      project.lifecycleStatus = lifecycleStatus;
    }

    // Auto-set dates
    if (status === "in-progress" && !project.startDate) {
      project.startDate = new Date();
    }
    if (status === "completed") {
      project.endDate = new Date();
      project.progress = 100;
    }

    await project.save();

    await logProjectActivity({
      project: project._id.toString(),
      actor: user.userId,
      actorType: "user",
      action: "status-changed",
      category: "project",
      description: `Project status changed from "${oldStatus}" to "${project.status}"`,
      before: { status: oldStatus, lifecycleStatus: oldLifecycle },
      after: { status: project.status, lifecycleStatus: project.lifecycleStatus },
    });

    return NextResponse.json({ project });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to update status";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
