import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import ProjectRequest from "@/models/project-request";
import Project from "@/models/project";
import Client from "@/models/client";
import connectToDatabase from "@/lib/mongodb";
import slugify from "slugify";

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    await connectToDatabase();
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");

    const query: Record<string, unknown> = {};
    if (status) query.status = status;

    const [requests, total] = await Promise.all([
      ProjectRequest.find(query)
        .populate("agent", "name slug role")
        .populate("project", "name slug status")
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      ProjectRequest.countDocuments(query),
    ]);

    return NextResponse.json({
      requests,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to fetch requests";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    await connectToDatabase();
    const body = await request.json();
    const { id, action, rejectionReason } = body;

    if (!id || !action) {
      return NextResponse.json({ error: "id and action are required" }, { status: 400 });
    }

    const projectRequest = await ProjectRequest.findById(id);
    if (!projectRequest) {
      return NextResponse.json({ error: "Project request not found" }, { status: 404 });
    }

    if (action === "approve") {
      projectRequest.approvalStatus = "approved";
      projectRequest.approvedBy = user.userId;
      projectRequest.approvedAt = new Date();
      projectRequest.status = "approved";
      await projectRequest.save();

      return NextResponse.json({ projectRequest, message: "Project request approved" });
    }

    if (action === "reject") {
      projectRequest.approvalStatus = "rejected";
      projectRequest.status = "rejected";
      await projectRequest.save();

      return NextResponse.json({ projectRequest, message: "Project request rejected" });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to update request";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
