import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import connectToDatabase from "@/lib/mongodb";
import Project from "@/models/project";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    await connectToDatabase();
    const { id } = await params;
    const body = await request.json();
    const { action, milestoneIndex, feedback, rating } = body;

    const project = await Project.findById(id);
    if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });

    const clientEmail = typeof project.client === "object" && project.client !== null
      ? (project.client as { email?: string }).email
      : null;

    if (clientEmail?.toLowerCase() !== user.email?.toLowerCase()) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (action === "approve-milestone" && milestoneIndex !== undefined) {
      if (!project.milestones[milestoneIndex]) {
        return NextResponse.json({ error: "Milestone not found" }, { status: 404 });
      }
      project.milestones[milestoneIndex].status = "approved";
      project.milestones[milestoneIndex].approvedAt = new Date();
      if (feedback) {
        project.milestones[milestoneIndex].feedback = {
          content: feedback,
          rating: rating || 5,
          submittedAt: new Date(),
          submittedBy: user.userId,
        };
      }
      await project.save();
      return NextResponse.json({ success: true, milestone: project.milestones[milestoneIndex] });
    }

    if (action === "reject-milestone" && milestoneIndex !== undefined) {
      if (!project.milestones[milestoneIndex]) {
        return NextResponse.json({ error: "Milestone not found" }, { status: 404 });
      }
      project.milestones[milestoneIndex].status = "pending";
      if (feedback) {
        project.milestones[milestoneIndex].feedback = {
          content: feedback,
          rating: rating || 1,
          submittedAt: new Date(),
          submittedBy: user.userId,
        };
      }
      await project.save();
      return NextResponse.json({ success: true, milestone: project.milestones[milestoneIndex] });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
