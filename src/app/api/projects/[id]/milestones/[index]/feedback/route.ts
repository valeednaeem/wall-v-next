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

    const body = await request.json();
    const { content, rating } = body;

    if (!content || !content.trim()) {
      return NextResponse.json(
        { error: "Feedback content is required" },
        { status: 400 }
      );
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

    // Set milestone status to changes-requested
    milestone.status = "changes-requested";
    milestone.feedback = {
      content: content.trim(),
      rating: rating || undefined,
      submittedAt: new Date(),
      submittedBy: authUser.userId,
    };

    // Update milestone version status
    if (project.milestoneVersions?.length) {
      const latestVersion = [...project.milestoneVersions]
        .filter((v) => v.milestoneIndex === milestoneIndex)
        .sort((a, b) => b.version - a.version)[0];
      if (latestVersion) {
        latestVersion.status = "rejected";
        latestVersion.feedback = {
          content: content.trim(),
          rating: rating || undefined,
          submittedAt: new Date(),
        };
      }
    }

    // Add project update
    if (!project.updates) {
      project.updates = [];
    }
    project.updates.push({
      title: `Changes requested for "${milestone.name}"`,
      description: `Client requested changes for milestone ${milestoneIndex + 1}: ${content.trim().slice(0, 200)}`,
      author: authUser.userId,
      createdAt: new Date(),
      milestoneIndex,
    });

    await project.save();

    // Notify
    if (project.projectManager) {
      createNotification(
        project.projectManager.toString(),
        "Changes Requested",
        `Client requested changes for "${milestone.name}" in project "${project.name}"`,
        "warning",
        `/dashboard/projects/${project._id}/edit`
      ).catch(() => {});
    }
    notifyAdmins(
      "Changes Requested",
      `Client requested changes for "${milestone.name}" in "${project.name}"`,
      "warning",
      `/dashboard/projects/${project._id}/edit`
    ).catch(() => {});

    return NextResponse.json({
      success: true,
      milestone: {
        name: milestone.name,
        index: milestoneIndex,
        status: "changes-requested",
        feedback: {
          content: content.trim(),
          rating: rating || undefined,
          submittedAt: milestone.feedback.submittedAt,
        },
      },
    });
  } catch (error) {
    console.error("[Milestone Feedback] Error:", error);
    return NextResponse.json(
      { error: "Failed to submit feedback" },
      { status: 500 }
    );
  }
}
