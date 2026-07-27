import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import Project from "@/models/project";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await connectToDatabase();

    const project = await Project.findById(id)
      .select("name title description status requirements quote client demoId milestones budget currency")
      .lean();

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: {
        id: project._id.toString(),
        name: project.name || project.title,
        description: project.description,
        status: project.status,
        requirements: project.requirements,
        quote: project.quote,
        client: project.client,
        demoId: project.demoId,
        milestones: (project.milestones || []).map((m, i) => ({
          index: i,
          name: m.name,
          description: m.description,
          status: m.status,
          amount: (m as Record<string, unknown>).amount || 0,
          dueDate: m.dueDate,
        })),
        budget: project.budget,
        currency: project.currency,
      },
    });
  } catch (error) {
    console.error("Checkout fetch error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
