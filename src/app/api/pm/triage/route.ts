import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import connectToDatabase from "@/lib/mongodb";
import { triageIntake, triageAllPending } from "@/lib/pm-triage";

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    await connectToDatabase();

    const body = await request.json();
    const { intakeId, triageAll } = body;

    if (triageAll) {
      const results = await triageAllPending();
      return NextResponse.json({ results });
    }

    if (!intakeId) {
      return NextResponse.json({ error: "intakeId or triageAll required" }, { status: 400 });
    }

    const result = await triageIntake(intakeId);
    return NextResponse.json({ result });
  } catch (error) {
    console.error("PM Triage error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
