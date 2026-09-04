import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { handleApiError, requireRole } from "@/lib/api-middleware";
import { detectContentDecay } from "@/lib/content-analytics";

export async function GET(request: Request) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const roleError = requireRole(user, ["super-admin", "admin", "manager"]);
    if (roleError) return roleError;

    const { searchParams } = new URL(request.url);
    const daysSincePublish = searchParams.get("daysSincePublish")
      ? parseInt(searchParams.get("daysSincePublish")!)
      : undefined;
    const viewThreshold = searchParams.get("viewThreshold")
      ? parseInt(searchParams.get("viewThreshold")!)
      : undefined;

    const report = await detectContentDecay({ daysSincePublish, viewThreshold });

    return NextResponse.json({ success: true, data: report });
  } catch (error) {
    return handleApiError(error, "Content decay GET");
  }
}
