import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import connectToDatabase from "@/lib/mongodb";
import Task from "@/models/task";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    await connectToDatabase();
    const { id } = await params;

    const task = await Task.findById(id)
      .populate("project", "name slug status")
      .populate("assignee", "name email avatar role")
      .populate("reporter", "name email")
      .populate("dependencies", "title status priority")
      .populate("stage", "name status");

    if (!task) return NextResponse.json({ error: "Task not found" }, { status: 404 });

    return NextResponse.json({ task });
  } catch (error) {
    console.error("Task GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    await connectToDatabase();
    const { id } = await params;

    const body = await request.json();
    const task = await Task.findByIdAndUpdate(id, body, { new: true })
      .populate("project", "name slug")
      .populate("assignee", "name email avatar")
      .populate("reporter", "name email")
      .populate("dependencies", "title status");

    if (!task) return NextResponse.json({ error: "Task not found" }, { status: 404 });

    return NextResponse.json({ task });
  } catch (error) {
    console.error("Task PUT error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    await connectToDatabase();
    const { id } = await params;

    const task = await Task.findByIdAndDelete(id);
    if (!task) return NextResponse.json({ error: "Task not found" }, { status: 404 });

    // Remove this task from other tasks' dependencies
    await Task.updateMany({ dependencies: id }, { $pull: { dependencies: id } });

    return NextResponse.json({ message: "Task deleted" });
  } catch (error) {
    console.error("Task DELETE error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
