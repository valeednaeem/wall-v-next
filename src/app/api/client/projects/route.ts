import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import connectToDatabase from "@/lib/mongodb";
import Project from "@/models/project";

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    await connectToDatabase();

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");

    const query: Record<string, unknown> = {
      $or: [
        { "client.email": user.email },
        { "client.email": user.email?.toLowerCase() },
      ],
    };
    if (status) query.status = status;

    const projects = await Project.find(query)
      .select("name title description status progress priority budget spent currency startDate endDate deadline milestones projectType tags paymentStatus financial updates")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    const total = await Project.countDocuments(query);

    const projectsWithStats = projects.map((p) => {
      const completedMilestones = p.milestones?.filter((m: { status: string }) => m.status === "completed" || m.status === "approved").length || 0;
      const totalMilestones = p.milestones?.length || 0;
      const latestUpdate = p.updates?.length > 0 ? p.updates[p.updates.length - 1] : null;

      return {
        _id: p._id,
        name: p.name,
        title: p.title,
        description: p.description,
        status: p.status,
        progress: p.progress || 0,
        priority: p.priority,
        projectType: p.projectType,
        budget: p.budget,
        spent: p.spent || 0,
        currency: p.currency || "USD",
        startDate: p.startDate,
        endDate: p.endDate,
        deadline: p.deadline,
        paymentStatus: p.paymentStatus,
        milestones: {
          total: totalMilestones,
          completed: completedMilestones,
          list: (p.milestones || []).map((m: { name: string; status: string; dueDate: Date; description: string; completedAt: Date; feedback?: { content: string; rating: number } }) => ({
            name: m.name,
            status: m.status,
            dueDate: m.dueDate,
            description: m.description,
            completedAt: m.completedAt,
            hasFeedback: !!m.feedback,
          })),
        },
        latestUpdate: latestUpdate ? {
          title: (latestUpdate as { title: string }).title,
          description: (latestUpdate as { description: string }).description,
          createdAt: (latestUpdate as { createdAt: Date }).createdAt,
        } : null,
        tags: p.tags,
        createdAt: (p as unknown as { createdAt: Date }).createdAt,
      };
    });

    return NextResponse.json({ projects: projectsWithStats, total, page, limit });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
