import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { handleApiError } from "@/lib/api-middleware";
import { connectToDatabase } from "@/lib/mongodb";
import ContentPlan from "@/models/content-plan";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectToDatabase();
    const { id } = await params;

    const plan = await ContentPlan.findById(id)
      .populate("campaign", "name slug status")
      .populate("topics", "title slug overallScore status primaryKeyword")
      .populate("approvedBy", "name email")
      .populate("createdBy", "name email")
      .lean();

    if (!plan) {
      return NextResponse.json({ error: "Plan not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: plan });
  } catch (error) {
    return handleApiError(error, "Plan GET");
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectToDatabase();
    const { id } = await params;
    const body = await request.json();

    const allowedFields = ["notes", "weekNumber", "startDate", "endDate"];
    const updates: Record<string, unknown> = {};
    for (const field of allowedFields) {
      if (field in body) {
        updates[field] = body[field];
      }
    }

    if (updates.startDate) updates.startDate = new Date(updates.startDate as string);
    if (updates.endDate) updates.endDate = new Date(updates.endDate as string);

    const plan = await ContentPlan.findByIdAndUpdate(id, updates, { new: true }).lean();
    if (!plan) {
      return NextResponse.json({ error: "Plan not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: plan });
  } catch (error) {
    return handleApiError(error, "Plan PUT");
  }
}
