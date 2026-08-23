import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import connectToDatabase from "@/lib/mongodb";
import ProjectStage from "@/models/project-stage";
import Task from "@/models/task";
import { logProjectActivity } from "@/lib/activity-logger";

// PUT /api/projects/stages/[stageId]/status
// Update stage status
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ stageId: string }> }
) {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    await connectToDatabase();
    const { stageId } = await params;
    const { status } = await request.json();

    const stage = await ProjectStage.findById(stageId);
    if (!stage) return NextResponse.json({ error: "Stage not found" }, { status: 404 });

    const oldStatus = stage.status;
    stage.status = status;

    if (status === "active") {
      stage.startDate = new Date();
    }
    if (status === "completed") {
      stage.completedAt = new Date();
      stage.completedBy = user.userId;
      if (stage.startDate) {
        stage.actualDays = Math.ceil(
          (stage.completedAt.getTime() - stage.startDate.getTime()) / (1000 * 60 * 60 * 24)
        );
      }
    }

    await stage.save();

    await logProjectActivity({
      project: stage.project.toString(),
      actor: user.userId,
      actorType: "user",
      action: "stage-status-changed",
      category: "stage",
      description: `Stage "${stage.name}" status changed from "${oldStatus}" to "${status}"`,
      entity: { model: "ProjectStage", id: stage._id.toString() },
      before: { status: oldStatus },
      after: { status },
    });

    return NextResponse.json({ stage });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to update stage";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// GET /api/projects/stages/[stageId]
// Get stage details with tasks
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ stageId: string }> }
) {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    await connectToDatabase();
    const { stageId } = await params;

    const stage = await ProjectStage.findById(stageId)
      .populate("tasks")
      .populate("completedBy", "name email");

    if (!stage) return NextResponse.json({ error: "Stage not found" }, { status: 404 });

    return NextResponse.json({ stage });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to fetch stage";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
