import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import Project from "@/models/project";
import { getAuthUserFromCookie } from "@/lib/auth-cookie";
import { notifyAdmins, createNotification } from "@/lib/notify";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string; index: string }> }
) {
  try {
    const authUser = await getAuthUserFromCookie();
    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id, index } = await params;
    const milestoneIndex = parseInt(index, 10);
    if (isNaN(milestoneIndex)) {
      return NextResponse.json({ error: "Invalid milestone index" }, { status: 400 });
    }

    await connectToDatabase();
    const project = await Project.findById(id);
    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    // Check ownership or admin
    const clientObj = project.client as { name?: string; email?: string };
    const isOwner = authUser.email === clientObj?.email;
    const isAdmin = ["super-admin", "admin", "manager"].includes(authUser.role);
    if (!isOwner && !isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (milestoneIndex >= (project.milestones?.length || 0)) {
      return NextResponse.json({ error: "Invalid milestone index" }, { status: 400 });
    }

    const milestone = project.milestones[milestoneIndex];

    // Approve the milestone
    milestone.status = "completed";
    milestone.completedAt = new Date();
    milestone.approvedAt = new Date();

    // Update milestone version status
    if (project.milestoneVersions?.length) {
      const latestVersion = [...project.milestoneVersions]
        .filter((v) => v.milestoneIndex === milestoneIndex)
        .sort((a, b) => b.version - a.version)[0];
      if (latestVersion) {
        latestVersion.status = "approved";
      }
    }

    // Set next milestone to in-progress if available
    if (milestoneIndex + 1 < project.milestones.length) {
      const nextMilestone = project.milestones[milestoneIndex + 1];
      if (nextMilestone.status === "pending") {
        nextMilestone.status = "in-progress";
      }
    }

    // Update project progress
    const completedCount = project.milestones.filter(
      (m: { status: string }) => m.status === "completed"
    ).length;
    project.progress = Math.round((completedCount / project.milestones.length) * 100);

    // Check if all milestones completed
    if (completedCount === project.milestones.length) {
      project.status = "completed";
    } else if (project.status === "review") {
      project.status = "in-progress";
    }

    // Add project update
    if (!project.updates) {
      project.updates = [];
    }
    project.updates.push({
      title: `Milestone "${milestone.name}" approved`,
      description: `Client approved milestone ${milestoneIndex + 1} of ${project.milestones.length}.`,
      author: authUser.userId,
      createdAt: new Date(),
      milestoneIndex,
    });

    await project.save();

    // Notify
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://www.wall-v.com";
    if (project.projectManager) {
      createNotification(
        project.projectManager.toString(),
        "Milestone Approved",
        `Client approved "${milestone.name}" for project "${project.name}"`,
        "success",
        `/dashboard/projects/${project._id}/edit`
      ).catch(() => {});
    }
    notifyAdmins(
      "Milestone Approved",
      `"${milestone.name}" for "${project.name}" was approved by client`,
      "success",
      `/dashboard/projects/${project._id}/edit`
    ).catch(() => {});

    return NextResponse.json({
      success: true,
      milestone: {
        name: milestone.name,
        index: milestoneIndex,
        status: "completed",
        approvedAt: milestone.approvedAt,
      },
      projectProgress: project.progress,
      allCompleted: completedCount === project.milestones.length,
    });
  } catch (error) {
    console.error("[Approve Milestone] Error:", error);
    return NextResponse.json(
      { error: "Failed to approve milestone" },
      { status: 500 }
    );
  }
}
