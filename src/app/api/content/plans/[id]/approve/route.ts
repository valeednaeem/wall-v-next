import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { handleApiError, requireRole } from "@/lib/api-middleware";
import { connectToDatabase } from "@/lib/mongodb";
import { approvePlan } from "@/lib/content-orchestrator";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const roleError = requireRole(user, ["super-admin", "admin", "manager"]);
    if (roleError) return roleError;

    await connectToDatabase();
    const { id } = await params;

    const plan = await approvePlan(id, user.userId);

    return NextResponse.json({ success: true, data: plan });
  } catch (error) {
    return handleApiError(error, "Plan approve POST");
  }
}
