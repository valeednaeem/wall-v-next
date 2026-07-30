import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import Project from "@/models/project";
import { getAuthUser } from "@/lib/auth";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

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
        milestones: (project.milestones || []).map((m: { name: string; description: string; status: string; amount?: number; dueDate?: string }, i: number) => ({
          index: i,
          name: m.name,
          description: m.description,
          status: m.status,
          amount: m.amount || 0,
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
