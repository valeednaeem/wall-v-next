import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { handleApiError, requireRole, ADMIN_ROLES } from "@/lib/api-middleware";
import { executeDailyContent } from "@/lib/content-scheduler";

export async function POST(request: Request) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const roleError = requireRole(user, ADMIN_ROLES);
    if (roleError) {
      return roleError;
    }

    const body = await request.json().catch(() => ({}));
    const apiKey = body?.apiKey || request.headers.get("x-api-key");

    const validApiKey = process.env.CONTENT_EXECUTION_API_KEY;
    if (validApiKey && apiKey !== validApiKey) {
      const hasRole = ADMIN_ROLES.includes(user.role);
      if (!hasRole) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    const result = await executeDailyContent();

    return NextResponse.json({
      success: true,
      data: result,
      executedAt: new Date().toISOString(),
    });
  } catch (error) {
    return handleApiError(error, "Content execute-daily POST");
  }
}
