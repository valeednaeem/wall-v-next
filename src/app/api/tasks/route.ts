import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import connectToDatabase from "@/lib/mongodb";
import Task from "@/models/task";

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    await connectToDatabase();

    const { searchParams } = new URL(request.url);
    const project = searchParams.get("project");
    const status = searchParams.get("status");
    const priority = searchParams.get("priority");
    const assignee = searchParams.get("assignee");
    const search = searchParams.get("search");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");
    const sort = searchParams.get("sort") || "order";
    const order = searchParams.get("order") || "asc";

    const query: Record<string, unknown> = {};
    if (project) query.project = project;
    if (status) query.status = status;
    if (priority) query.priority = priority;
    if (assignee) query.assignee = assignee;
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
      ];
    }

    const [tasks, total] = await Promise.all([
      Task.find(query)
        .populate("project", "name slug")
        .populate("assignee", "name email avatar")
        .populate("reporter", "name email")
        .populate("dependencies", "title status")
        .sort({ [sort]: order === "asc" ? 1 : -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      Task.countDocuments(query),
    ]);

    return NextResponse.json({
      tasks,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error("Tasks GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    await connectToDatabase();

    const body = await request.json();
    const task = await Task.create({
      ...body,
      reporter: user.userId,
      loggedHours: 0,
      order: body.order || 0,
    });

    const populated = await Task.findById(task._id)
      .populate("project", "name slug")
      .populate("assignee", "name email avatar")
      .populate("reporter", "name email");

    return NextResponse.json({ task: populated }, { status: 201 });
  } catch (error) {
    console.error("Tasks POST error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
