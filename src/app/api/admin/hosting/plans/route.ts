import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { getAllHostingPlans } from "@/lib/hosting";

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user || !["super-admin", "admin"].includes(user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

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
