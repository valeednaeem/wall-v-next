import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import Project from "@/models/project";
import { getAuthUser } from "@/lib/auth";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    await connectToDatabase();

    const project = await Project.findById(id)
      .populate("stages")
      .populate("currentStage")
      .populate("requirements")
      .populate("changeRequests")
      .populate("clientRef", "name email phone company")
      .populate("projectManager", "name email")
      .populate("team.user", "name email role")
      .lean();

    if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });

    // Ownership check: client can only see their own projects
    const isAdmin = ["super-admin", "admin", "manager", "staff"].includes(user.role);
    if (!isAdmin) {
      const clientEmail = (typeof project.client === "object" && project.client !== null
        ? (project.client as { email?: string }).email
        : null) || project.clientRef?.email || "";
      if (!clientEmail || clientEmail.toLowerCase() !== user.email?.toLowerCase()) {
        return NextResponse.json({ error: "Project not found" }, { status: 404 });
      }
    }

    return NextResponse.json({ success: true, project });
  } catch (error) {
    console.error("Client project GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
