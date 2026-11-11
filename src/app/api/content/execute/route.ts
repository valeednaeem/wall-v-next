import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { handleApiError, requireRole } from "@/lib/api-middleware";
import { executeDailyContent, checkPendingExecutions } from "@/lib/content-scheduler";

export async function POST(request: Request) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const roleError = requireRole(user, ["super-admin", "admin"]);
    if (roleError) return roleError;

    const body = await request.json().catch(() => ({}));
    const action = body.action as string;

    if (action === "check") {
      const pending = await checkPendingExecutions();
      return NextResponse.json({
        success: true,
        data: { pending, count: pending.length },
      });
    }

    // Execute all pending content
    console.log(`[Content:ManualTrigger] Triggered by ${user.email}`);
    const result = await executeDailyContent();
    console.log(`[Content:ManualTrigger] Completed:`, JSON.stringify(result));

    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    return handleApiError(error, "Content manual execute POST");
  }
}

export async function GET(request: Request) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const roleError = requireRole(user, ["super-admin", "admin"]);
    if (roleError) return roleError;

    const pending = await checkPendingExecutions();
    return NextResponse.json({
      success: true,
      data: { pending, count: pending.length },
    });
  } catch (error) {
    return handleApiError(error, "Content manual execute GET");
  }
}
