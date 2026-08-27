import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { PERMISSIONS, hasPermission } from "@/lib/permissions";
import Agent from "@/models/agent";
import connectToDatabase from "@/lib/mongodb";

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!hasPermission(user.permissions || [], PERMISSIONS.AGENTS_EDIT)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await connectToDatabase();
    const body = await request.json();
    const { action, agentIds } = body;

    if (!action || !agentIds?.length) {
      return NextResponse.json({ error: "action and agentIds are required" }, { status: 400 });
    }

    let result;
    switch (action) {
      case "activate":
        result = await Agent.updateMany({ _id: { $in: agentIds } }, { status: "active" });
        break;
      case "deactivate":
        result = await Agent.updateMany({ _id: { $in: agentIds } }, { status: "inactive" });
        break;
      case "delete": {
        const deleteResult = await Agent.deleteMany({ _id: { $in: agentIds }, isMasterAgent: { $ne: true } });
        return NextResponse.json({ success: true, modified: deleteResult.deletedCount });
      }
      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    return NextResponse.json({ success: true, modified: "modifiedCount" in result ? result.modifiedCount : 0 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Batch operation failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
