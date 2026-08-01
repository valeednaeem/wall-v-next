import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import Project from "@/models/project";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ demoId: string }> }
) {
  try {
    const { demoId } = await params;
    await connectToDatabase();

    const project = await Project.findOne({ demoId })
      .select("name title description status demoHTML demoId requirements quote client language")
      .lean();

    if (!project) {
      return NextResponse.json({ error: "Demo not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: {
        id: project._id.toString(),
        name: project.name || project.title,
        description: project.description,
        status: project.status,
        demoHTML: project.demoHTML,
        demoId: project.demoId,
        requirements: project.requirements,
        quote: project.quote,
        client: project.client,
        language: project.language,
      },
    });
  } catch (error) {
    console.error("Public preview fetch error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
