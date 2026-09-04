import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { handleApiError, requireRole } from "@/lib/api-middleware";
import { connectToDatabase } from "@/lib/mongodb";
import { requestPlanChanges } from "@/lib/content-orchestrator";

export async function POST(
  request: Request,
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
    const body = await request.json();

    if (!body.message) {
      return NextResponse.json(
        { error: "Missing required field: message" },
        { status: 400 }
      );
    }

    const plan = await requestPlanChanges(id, user.userId, body.message);

    return NextResponse.json({ success: true, data: plan });
  } catch (error) {
    return handleApiError(error, "Plan changes POST");
  }
}
