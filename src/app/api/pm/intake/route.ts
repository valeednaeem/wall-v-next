import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import connectToDatabase from "@/lib/mongodb";
import PmIntake from "@/models/pm-intake";

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
    if (status) query.triageStatus = status;

    const [intakes, total] = await Promise.all([
      PmIntake.find(query)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      PmIntake.countDocuments(query),
    ]);

    return NextResponse.json({
      intakes,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error("PM Intake GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    await connectToDatabase();

    const body = await request.json();
    const intake = await PmIntake.create({
      ...body,
      triageStatus: "pending",
    });

    return NextResponse.json({ intake }, { status: 201 });
  } catch (error) {
    console.error("PM Intake POST error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
