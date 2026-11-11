import { NextRequest, NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongodb";
import HostingPlan from "@/models/hosting-plan";

export async function GET(request: NextRequest) {
  try {
    await connectToDatabase();

    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category");

    const query: Record<string, unknown> = { isActive: true };
    if (category) query.category = category;

    const plans = await HostingPlan.find(query)
      .select("-createdBy -__v")
      .sort({ sortOrder: 1 })
      .lean();

    return NextResponse.json({
      success: true,
      plans,
      total: plans.length,
    });
  } catch (error) {
    console.error("Get public hosting plans error:", error);
    return NextResponse.json(
      { error: "Failed to get hosting plans" },
      { status: 500 }
    );
  }
}
