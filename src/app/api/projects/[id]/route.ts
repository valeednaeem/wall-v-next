import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import Project from "@/models/project";
import Client from "@/models/client";
import { getAuthUser } from "@/lib/auth";
import { pickFields } from "@/lib/pick-fields";
import { verifyCsrfToken, CSRF_HEADER_NAME } from "@/lib/csrf";
import mongoose from "mongoose";
import { logError } from "@/lib/error-logger";

const PROJECT_UPDATE_FIELDS = ["name", "title", "description", "status", "requirements", "budget", "currency", "milestones", "demoHTML", "demoId", "client", "priority", "progress", "paymentStatus"];

async function resolveClient(clientField: unknown): Promise<{ name: string; email: string; phone?: string } | null> {
  if (!clientField) return null;
  if (typeof clientField === "object" && clientField !== null) {
    return clientField as { name: string; email: string; phone?: string };
  }
  if (typeof clientField === "string" && mongoose.Types.ObjectId.isValid(clientField)) {
    const client = await Client.findById(clientField).select("name email phone").lean();
    if (client) {
      return { name: client.name, email: client.email, phone: client.phone };
    }
  }
  return null;
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  let id: string | undefined;
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectToDatabase();
    const resolved = await params;
    id = resolved.id;
    const project = await Project.findById(id).lean();
    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    // Check ownership for non-admin users
    const adminRoles = ["super-admin", "admin", "manager"];
    if (!adminRoles.includes(user.role)) {
      const resolvedClient = await resolveClient(project.client);
      const clientEmail = resolvedClient?.email || (typeof project.client === "object" && project.client !== null ? (project.client as { email?: string }).email : null);
      if (!clientEmail || clientEmail !== user.email) {
        return NextResponse.json({ error: "Project not found" }, { status: 404 });
      }
    }

    const resolvedClient = await resolveClient(project.client);
    return NextResponse.json({ project: { ...project, client: resolvedClient || project.client } });
  } catch (error) {
    await logError({
      level: "error",
      message: "Error fetching project",
      source: "api/projects/[id]",
      stack: error instanceof Error ? error.stack : undefined,
      metadata: { projectId: id },
    });
    return NextResponse.json({ error: "Failed to fetch project" }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  let id: string | undefined;
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const csrfToken = request.headers.get(CSRF_HEADER_NAME);
    if (!csrfToken || !verifyCsrfToken(csrfToken)) {
      return NextResponse.json({ error: "Invalid CSRF token" }, { status: 403 });
    }

    await connectToDatabase();
    const resolved = await params;
    id = resolved.id;
    const body = await request.json();
    const projectData = pickFields(body, PROJECT_UPDATE_FIELDS);

    const project = await Project.findByIdAndUpdate(id, projectData, { new: true }).lean();
    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    return NextResponse.json({ project });
  } catch (error) {
    await logError({
      level: "error",
      message: "Error updating project",
      source: "api/projects/[id]",
      stack: error instanceof Error ? error.stack : undefined,
      metadata: { projectId: id },
    });
    return NextResponse.json({ error: "Failed to update project" }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  let id: string | undefined;
  try {
    const user = await getAuthUser();
    if (!user || !["super-admin", "admin"].includes(user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectToDatabase();
    const resolved = await params;
    id = resolved.id;
    await Project.findByIdAndDelete(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    await logError({
      level: "error",
      message: "Error deleting project",
      source: "api/projects/[id]",
      stack: error instanceof Error ? error.stack : undefined,
      metadata: { projectId: id },
    });
    return NextResponse.json({ error: "Failed to delete project" }, { status: 500 });
  }
}
