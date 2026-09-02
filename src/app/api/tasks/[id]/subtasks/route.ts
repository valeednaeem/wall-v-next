import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import connectToDatabase from "@/lib/mongodb";
import Task from "@/models/task";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    await connectToDatabase();
    const { id } = await params;

    const { title } = await request.json();
    if (!title) return NextResponse.json({ error: "title required" }, { status: 400 });

    const task = await Task.findByIdAndUpdate(
      id,
      { $push: { subtasks: { title, completed: false } } },
      { new: true }
    );

    return NextResponse.json({ task });
  } catch (error) {
    console.error("Subtasks POST error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    await connectToDatabase();
    const { id } = await params;

    const { subtaskIndex, completed, title } = await request.json();

    const task = await Task.findById(id);
    if (!task) return NextResponse.json({ error: "Task not found" }, { status: 404 });

    if (subtaskIndex !== undefined && task.subtasks[subtaskIndex]) {
      if (completed !== undefined) task.subtasks[subtaskIndex].completed = completed;
      if (title !== undefined) task.subtasks[subtaskIndex].title = title;
      await task.save();
    }

    return NextResponse.json({ task });
  } catch (error) {
    console.error("Subtasks PUT error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    await connectToDatabase();
    const { id } = await params;

    const { subtaskIndex } = await request.json();

    const task = await Task.findById(id);
    if (!task) return NextResponse.json({ error: "Task not found" }, { status: 404 });

    if (subtaskIndex !== undefined) {
      task.subtasks.splice(subtaskIndex, 1);
      await task.save();
    }

    return NextResponse.json({ task });
  } catch (error) {
    console.error("Subtasks DELETE error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
