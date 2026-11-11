import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import Agent from "@/models/agent";
import connectToDatabase from "@/lib/mongodb";

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (user.role !== "super-admin" && user.role !== "admin") {
      return NextResponse.json({ error: "Only admins can perform this action" }, { status: 403 });
    }

    await connectToDatabase();

    const result = await Agent.updateMany(
      { status: "active" },
      { $set: { isClientFacing: true } }
    );

    const total = await Agent.countDocuments({});
    const active = await Agent.countDocuments({ status: "active" });
    const clientFacing = await Agent.countDocuments({ isClientFacing: true });

    return NextResponse.json({
      success: true,
      modified: result.modifiedCount,
      stats: { total, active, clientFacing },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to update agents";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
