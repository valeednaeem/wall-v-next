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

    const { dependencyId } = await request.json();
    if (!dependencyId) return NextResponse.json({ error: "dependencyId required" }, { status: 400 });

    // Prevent self-dependency
    if (id === dependencyId) return NextResponse.json({ error: "Cannot depend on self" }, { status: 400 });

    // Check for circular dependencies
    const depTask = await Task.findById(dependencyId);
    if (!depTask) return NextResponse.json({ error: "Dependency task not found" }, { status: 404 });

    const task = await Task.findByIdAndUpdate(
      id,
      { $addToSet: { dependencies: dependencyId } },
      { new: true }
    ).populate("dependencies", "title status");

    return NextResponse.json({ task });
  } catch (error) {
    console.error("Dependencies POST error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    await connectToDatabase();
    const { id } = await params;

    const { dependencyId } = await request.json();

    const task = await Task.findByIdAndUpdate(
      id,
      { $pull: { dependencies: dependencyId } },
      { new: true }
    ).populate("dependencies", "title status");

    return NextResponse.json({ task });
  } catch (error) {
    console.error("Dependencies DELETE error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
