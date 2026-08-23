import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import connectToDatabase from "@/lib/mongodb";
import Project from "@/models/project";
import ProjectStage from "@/models/project-stage";
import Task from "@/models/task";
import { generateStagesForProject } from "@/lib/stage-templates";
import { logProjectActivity } from "@/lib/activity-logger";

// POST /api/projects/[id]/lifecycle/generate-stages
// AI-generates initial stages based on project type
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    await connectToDatabase();
    const { id } = await params;

    const project = await Project.findById(id);
    if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });

    const projectType = project.projectType || "other";
    const stageTemplates = generateStagesForProject(projectType);

    const createdStages = [];
    let order = 1;

    for (const template of stageTemplates) {
      const stage = await ProjectStage.create({
        project: project._id,
        name: template.name,
        description: template.description,
        order,
        type: template.type,
        status: order === 1 ? "active" : "pending",
        estimatedDays: template.estimatedDays,
        acceptanceCriteria: template.acceptanceCriteria,
        generatedBy: "ai",
      });

      // Create tasks for each stage
      const taskIds = [];
      let taskOrder = 1;
      for (const taskDef of template.tasks) {
        const task = await Task.create({
          title: taskDef.title,
          description: taskDef.description,
          project: project._id,
          stage: stage._id,
          reporter: user.userId,
          status: order === 1 ? "todo" : "todo",
          priority: taskDef.priority,
          estimatedHours: taskDef.estimatedHours,
          order: taskOrder,
        });
        taskIds.push(task._id);
        taskOrder++;
      }

      stage.tasks = taskIds;
      await stage.save();

      createdStages.push(stage);
      order++;
    }

    // Update project
    project.stages = createdStages.map((s) => s._id);
    project.currentStage = createdStages[0]?._id;
    project.status = "planning";
    project.lifecycleStatus = "requirements-gathered";
    await project.save();

    // Log activity
    await logProjectActivity({
      project: project._id.toString(),
      actor: user.userId,
      actorType: "ai",
      action: "stages-generated",
      category: "stage",
      description: `Generated ${createdStages.length} stages for ${projectType} project`,
      after: { stageCount: createdStages.length, stages: createdStages.map((s) => s.name) },
    });

    return NextResponse.json({
      project,
      stages: createdStages,
      message: `Generated ${createdStages.length} stages`,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to generate stages";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
