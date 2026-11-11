import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import Project from "@/models/project";
import User from "@/models/user";
import { getAuthUserFromCookie } from "@/lib/auth-cookie";
import { notifyAdmins, createNotification } from "@/lib/notify";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = await getAuthUserFromCookie();
    if (!authUser || !["super-admin", "admin"].includes(authUser.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const { projectManagerId } = body;

    await connectToDatabase();

    const project = await Project.findById(id);
    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    // Validate project manager exists and has appropriate role
    if (projectManagerId) {
      const pm = await User.findById(projectManagerId);
      if (!pm) {
        return NextResponse.json({ error: "Project manager not found" }, { status: 404 });
      }
      if (!["super-admin", "admin", "manager", "project-manager"].includes(pm.role)) {
        return NextResponse.json({ error: "User is not a project manager" }, { status: 400 });
      }
      project.projectManager = pm._id;

      // Add to team if not already there
      const alreadyInTeam = project.team.some(
        (t: { user: { toString(): string } }) => t.user.toString() === pm._id.toString()
      );
      if (!alreadyInTeam) {
        project.team.push({ user: pm._id, role: "Project Manager" });
      }

      // Notify the PM
      createNotification(
        pm._id.toString(),
        "Project Assigned",
        `You have been assigned as Project Manager for "${project.name}"`,
        "info",
        `/dashboard/projects/${project._id}/edit`
      ).catch(() => {});
    } else {
      project.projectManager = undefined;
    }

    // Add update
    if (!project.updates) {
      project.updates = [];
    }
    project.updates.push({
      title: projectManagerId ? "Project Manager assigned" : "Project Manager removed",
      description: projectManagerId
        ? `Project Manager has been assigned to this project.`
        : `Project Manager has been removed from this project.`,
      author: authUser.userId,
      createdAt: new Date(),
    });

    await project.save();

    return NextResponse.json({
      success: true,
      projectManager: projectManagerId || null,
    });
  } catch (error) {
    console.error("[Assign PM] Error:", error);
    return NextResponse.json(
      { error: "Failed to assign project manager" },
      { status: 500 }
    );
  }
}
