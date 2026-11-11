import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import connectToDatabase from "@/lib/mongodb";
import PmAlert from "@/models/pm-alert";

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    await connectToDatabase();

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") || "active";
    const severity = searchParams.get("severity");
    const category = searchParams.get("category");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");

    const query: Record<string, unknown> = {};
    if (status) query.status = status;
    if (severity) query.severity = severity;
    if (category) query.category = category;

    const [alerts, total] = await Promise.all([
      PmAlert.find(query)
        .sort({ severity: 1, createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .populate("project", "name slug")
        .populate("assignedTo", "name email")
        .lean(),
      PmAlert.countDocuments(query),
    ]);

    return NextResponse.json({
      alerts,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error("PM Alerts GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    await connectToDatabase();

    const body = await request.json();
    const alert = await PmAlert.create(body);

    return NextResponse.json({ alert }, { status: 201 });
  } catch (error) {
    console.error("PM Alerts POST error:", error);
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

    if (!id) return NextResponse.json({ error: "Alert ID required" }, { status: 400 });

    const alert = await PmAlert.findByIdAndUpdate(id, update, { new: true });
    return NextResponse.json({ alert });
  } catch (error) {
    console.error("PM Alerts PUT error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
