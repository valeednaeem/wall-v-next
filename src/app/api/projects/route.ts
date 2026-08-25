import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import Project from "@/models/project";
import Client from "@/models/client";
import { getAuthUser } from "@/lib/auth";
import { escapeRegex } from "@/lib/escape-regex";
import mongoose from "mongoose";
import { logError } from "@/lib/error-logger";

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "") + `-${Date.now()}`;
}

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

export async function GET(request: Request) {
  let user;
  try {
    user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectToDatabase();
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const search = searchParams.get("search");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");

    const query: Record<string, unknown> = {};
    if (status && status !== "all") query.status = status;
    if (search) {
      const safeSearch = escapeRegex(search);
      query.$or = [
        { name: { $regex: safeSearch, $options: "i" } },
        { title: { $regex: safeSearch, $options: "i" } },
        { description: { $regex: safeSearch, $options: "i" } },
      ];
    }

    // Scope projects to client for non-admin users
    const adminRoles = ["super-admin", "admin", "manager"];
    if (!adminRoles.includes(user.role)) {
      // Find client records linked to this user's email or user ID
      const client = await Client.findOne({
        $or: [
          { email: user.email?.toLowerCase() || "" },
          { user: user.userId },
        ],
      }).lean();

      if (client) {
        // Show projects belonging to this client (by clientRef, embedded email, or client ObjectId)
        query.$or = [
          { clientRef: client._id },
          { "client.email": user.email?.toLowerCase() || "" },
          { "client": client._id.toString() },
        ];
      } else {
        // No client record — try to find projects by email directly
        query.$or = [
          { "client.email": user.email?.toLowerCase() || "" },
        ];
      }
    }

    const total = await Project.countDocuments(query);
    const projects = await Project.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate("stages")
      .populate("requirements")
      .populate("changeRequests")
      .populate("clientRef", "name email phone company")
      .lean();

    // Resolve client references - if client is a string (ObjectId), look up the Client
    const resolvedProjects = await Promise.all(
      projects.map(async (project) => {
        const resolvedClient = await resolveClient(project.client);
        return { ...project, client: resolvedClient || project.client };
      })
    );

    return NextResponse.json({ projects: resolvedProjects, total, page, limit });
  } catch (error) {
    await logError({
      level: "error",
      message: "Error fetching projects",
      source: "api/projects",
      stack: error instanceof Error ? error.stack : undefined,
      metadata: { userId: user?.userId },
    });
    return NextResponse.json({ error: "Failed to fetch projects" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  let user;
  try {
    user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!["super-admin", "admin", "manager"].includes(user.role)) {
      return NextResponse.json({ error: "Forbidden: insufficient permissions" }, { status: 403 });
    }

    await connectToDatabase();
    const body = await request.json();

    const slug = slugify(body.name || body.title || "project");

    const project = await Project.create({
      ...body,
      slug,
      status: body.status || "planning",
      progress: body.progress || 0,
      budget: body.budget || 0,
      spent: body.spent || 0,
      currency: body.currency || "USD",
      milestones: body.milestones || [],
      team: body.team || [],
      tags: body.tags || [],
      files: body.files || [],
      tasks: body.tasks || [],
    });

    return NextResponse.json({ project }, { status: 201 });
  } catch (error) {
    await logError({
      level: "error",
      message: "Error creating project",
      source: "api/projects",
      stack: error instanceof Error ? error.stack : undefined,
      metadata: { userId: user?.userId },
    });
    return NextResponse.json({ error: "Failed to create project" }, { status: 500 });
  }
}
