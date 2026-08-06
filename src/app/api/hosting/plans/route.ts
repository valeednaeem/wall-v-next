import { NextRequest, NextResponse } from "next/server";
import { getAllHostingPlans } from "@/lib/hosting";

export async function GET(request: NextRequest) {
  try {
    const plans = await getAllHostingPlans();

    return NextResponse.json({
      success: true,
      plans,
      total: plans.length,
    });
  } catch (error) {
    console.error("Get hosting plans error:", error);
    return NextResponse.json(
      { error: "Failed to get hosting plans" },
      { status: 500 }
    );
  }
}
