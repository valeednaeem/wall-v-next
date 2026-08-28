import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import connectToDatabase from "@/lib/mongodb";
import Project from "@/models/project";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    await connectToDatabase();
    const { id } = await params;

    const project = await Project.findById(id)
      .populate("stages", "name description order status tasks deliverables estimatedDays actualDays startDate endDate completedAt")
      .populate("requirements", "title description category priority status scope")
      .lean();

    if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });

    const clientEmail = typeof project.client === "object" && project.client !== null
      ? (project.client as { email?: string }).email
      : null;

    if (clientEmail?.toLowerCase() !== user.email?.toLowerCase() && !["super-admin", "admin"].includes(user.role || "")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json({
      _id: project._id,
      name: project.name,
      title: project.title,
      description: project.description,
      status: project.status,
      lifecycleStatus: project.lifecycleStatus,
      progress: project.progress || 0,
      priority: project.priority,
      projectType: project.projectType,
      budget: project.budget,
      spent: project.spent || 0,
      currency: project.currency || "USD",
      startDate: project.startDate,
      endDate: project.endDate,
      deadline: project.deadline,
      paymentStatus: project.paymentStatus,
      financial: project.financial,
      milestones: project.milestones || [],
      stages: project.stages || [],
      requirements: project.requirements || [],
      files: project.files || [],
      updates: project.updates || [],
      tags: project.tags,
      notes: project.notes,
      scope: project.scope,
      createdAt: (project as unknown as { createdAt: Date }).createdAt,
      updatedAt: (project as unknown as { updatedAt: Date }).updatedAt,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
