import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import AITool from "@/models/ai-tool";
import { getAuthUser } from "@/lib/auth";
import { PERMISSIONS, hasPermission } from "@/lib/permissions";
import { logAiToolAction } from "@/lib/tools/api-guard";
import { handleApiError } from "@/lib/api-middleware";

const STATUS_BY_ACTION: Record<string, string> = {
  publish: "published",
  unpublish: "unpublished",
  archive: "archived",
};

export async function POST(request: Request) {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const ids: string[] = Array.isArray(body.ids) ? body.ids : [];
    const action: string = body.action || "";
    if (!ids.length || !action) {
      return NextResponse.json({ error: "ids and action are required" }, { status: 400 });
    }

    const isDelete = action === "delete";
    const required = isDelete ? PERMISSIONS.AI_TOOLS_DELETE : PERMISSIONS.AI_TOOLS_PUBLISH;
    if (!hasPermission(user.permissions || [], required)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (!isDelete && !STATUS_BY_ACTION[action]) {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    await connectToDatabase();
    let affected = 0;
    if (isDelete) {
      const result = await AITool.deleteMany({ _id: { $in: ids } });
      affected = result.deletedCount || 0;
    } else {
      const result = await AITool.updateMany(
        { _id: { $in: ids } },
        { $set: { status: STATUS_BY_ACTION[action] } }
      );
      affected = result.modifiedCount || 0;
    }

    await logAiToolAction(user, `ai_tool.bulk_${action}`, "AITool", ids.join(","), { count: affected });
    return NextResponse.json({ success: true, data: { affected } });
  } catch (error) {
    return handleApiError(error, "ai-tools bulk");
  }
}
