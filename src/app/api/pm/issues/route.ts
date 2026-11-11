import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import connectToDatabase from "@/lib/mongodb";
import PmIssue from "@/models/pm-issue";

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    await connectToDatabase();

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const severity = searchParams.get("severity");
    const project = searchParams.get("project");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");

    const query: Record<string, unknown> = {};
    if (status) query.status = status;
    if (severity) query.severity = severity;
    if (project) query.project = project;

    const [issues, total] = await Promise.all([
      PmIssue.find(query)
        .sort({ severity: 1, createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .populate("project", "name slug")
        .populate("assignedTo", "name email")
        .lean(),
      PmIssue.countDocuments(query),
    ]);

    return NextResponse.json({
      issues,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error("PM Issues GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    await connectToDatabase();

    const body = await request.json();
    const issue = await PmIssue.create({
      ...body,
      reportedBy: user.userId,
      reportedByType: "user",
    });

    return NextResponse.json({ issue }, { status: 201 });
  } catch (error) {
    console.error("PM Issues POST error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    await connectToDatabase();

    const body = await request.json();
    const { id, ...update } = body;

    if (!id) return NextResponse.json({ error: "Issue ID required" }, { status: 400 });

    const issue = await PmIssue.findByIdAndUpdate(id, update, { new: true });
    return NextResponse.json({ issue });
  } catch (error) {
    console.error("PM Issues PUT error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
