import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { getAdminCenterData } from "@/lib/pm-admin-center";

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const data = await getAdminCenterData();
    return NextResponse.json({ data });
  } catch (error) {
    console.error("Admin Center API error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
