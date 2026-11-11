import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import connectToDatabase from "@/lib/mongodb";
import PmRisk from "@/models/pm-risk";

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

    const [risks, total] = await Promise.all([
      PmRisk.find(query)
        .sort({ severity: 1, createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .populate("project", "name slug")
        .populate("owner", "name email")
        .lean(),
      PmRisk.countDocuments(query),
    ]);

    return NextResponse.json({
      risks,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error("PM Risks GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    await connectToDatabase();

    const body = await request.json();
    const risk = await PmRisk.create({
      ...body,
      identifiedBy: user.userId,
      identifiedByType: "user",
    });

    return NextResponse.json({ risk }, { status: 201 });
  } catch (error) {
    console.error("PM Risks POST error:", error);
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

    if (!id) return NextResponse.json({ error: "Risk ID required" }, { status: 400 });

    const risk = await PmRisk.findByIdAndUpdate(id, update, { new: true });
    return NextResponse.json({ risk });
  } catch (error) {
    console.error("PM Risks PUT error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
