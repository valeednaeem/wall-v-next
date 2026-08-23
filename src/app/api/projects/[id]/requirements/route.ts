import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import connectToDatabase from "@/lib/mongodb";
import ProjectRequirement from "@/models/project-requirement";
import Project from "@/models/project";
import { logProjectActivity } from "@/lib/activity-logger";

// GET /api/projects/[id]/requirements
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    await connectToDatabase();
    const { id } = await params;

    const requirements = await ProjectRequirement.find({ project: id })
      .populate("createdBy", "name email")
      .sort({ createdAt: -1 });

    return NextResponse.json({ requirements });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to fetch requirements";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// POST /api/projects/[id]/requirements
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
    const { title, description, category, priority, scope, source } = body;

    if (!title || !description) {
      return NextResponse.json({ error: "Title and description are required" }, { status: 400 });
    }

    const requirement = await ProjectRequirement.create({
      project: id,
      title,
      description,
      category: category || "functional",
      priority: priority || "must-have",
      scope: scope || "in-scope",
      source: source || "client",
      createdBy: user.userId,
    });

    // Update project
    await Project.findByIdAndUpdate(id, {
      $push: { requirements: requirement._id },
    });

    await logProjectActivity({
      project: id,
      actor: user.userId,
      actorType: "user",
      action: "requirement-added",
      category: "requirement",
      description: `Added requirement: "${title}"`,
      entity: { model: "ProjectRequirement", id: requirement._id.toString() },
      after: { title, category, priority, scope },
    });

    return NextResponse.json({ requirement }, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to create requirement";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
