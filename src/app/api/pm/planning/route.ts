import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import connectToDatabase from "@/lib/mongodb";
import { decomposeProject } from "@/lib/pm-decomposition";
import { generateSchedule, getProjectHealth } from "@/lib/pm-planning";
import PmAuditLog from "@/models/pm-audit-log";

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    await connectToDatabase();

    const { projectId, action } = await request.json();

    if (!projectId) return NextResponse.json({ error: "projectId required" }, { status: 400 });

    if (action === "decompose") {
      const result = await decomposeProject(projectId);

      await PmAuditLog.create({
        action: "decompose-project",
        category: "planning",
        description: `Decomposed project into ${result.totalTasks} tasks (${result.totalEstimatedHours}h estimated)`,
        project: projectId,
        actorType: "ai",
        reasoning: `Generated ${result.phases.length} phases with critical path of ${result.criticalPath.length} tasks`,
        confidence: 0.85,
        result: "success",
      });

      return NextResponse.json({ result });
    }

    if (action === "schedule") {
      const schedule = await generateSchedule(projectId);

      await PmAuditLog.create({
        action: "generate-schedule",
        category: "planning",
        description: `Generated schedule: ${schedule.totalDuration}h total, ${schedule.criticalPath.length} critical tasks`,
        project: projectId,
        actorType: "ai",
        confidence: 0.8,
        result: "success",
      });

      return NextResponse.json({ schedule });
    }

    if (action === "health") {
      const health = await getProjectHealth(projectId);
      return NextResponse.json({ health });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("PM Planning error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
