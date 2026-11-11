import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import AITool from "@/models/ai-tool";
import { getAuthUser } from "@/lib/auth";
import { PERMISSIONS, hasPermission } from "@/lib/permissions";
import { aiToolSchema } from "@/lib/validations/ai-tool";
import { logAiToolAction } from "@/lib/tools/api-guard";
import { handleApiError } from "@/lib/api-middleware";

interface Params {
  params: Promise<{ id: string }>;
}

export async function GET(_request: Request, { params }: Params) {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!hasPermission(user.permissions || [], PERMISSIONS.AI_TOOLS_VIEW)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    await connectToDatabase();
    const tool = await AITool.findById(id)
      .populate("category", "name slug")
      .populate("tags", "name slug")
      .populate("aiConfig.provider", "name slug type")
      .populate("requiredPlan", "name slug")
      .lean();
    if (!tool) return NextResponse.json({ error: "Tool not found" }, { status: 404 });
    return NextResponse.json({ success: true, data: tool });
  } catch (error) {
    return handleApiError(error, "ai-tools/[id] GET");
  }
}

export async function PUT(request: Request, { params }: Params) {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!hasPermission(user.permissions || [], PERMISSIONS.AI_TOOLS_EDIT)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const parsed = aiToolSchema.partial().safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ") },
        { status: 400 }
      );
    }

    await connectToDatabase();
    const tool = await AITool.findById(id);
    if (!tool) return NextResponse.json({ error: "Tool not found" }, { status: 404 });

    const before: Record<string, unknown> = {};
    const changes = parsed.data;
    for (const key of Object.keys(changes) as (keyof typeof changes)[]) {
      before[key] = tool[key];
    }

    const doc: Record<string, unknown> = { ...changes };
    // Empty strings must not be cast to ObjectIds (Mongoose CastError)
    if ("requiredPlan" in doc && !doc.requiredPlan) delete doc.requiredPlan;
    if ("aiConfig" in doc && doc.aiConfig) {
      const cfg = { ...(doc.aiConfig as Record<string, unknown>) };
      if (!cfg.provider) delete cfg.provider;
      doc.aiConfig = cfg;
    }
    if ("category" in doc && !doc.category) delete doc.category;

    Object.assign(tool, doc);
    await tool.save();

    await logAiToolAction(user, "ai_tool.updated", "AITool", String(tool._id), { before, after: changes });
    return NextResponse.json({ success: true, data: tool });
  } catch (error) {
    return handleApiError(error, "ai-tools/[id] PUT");
  }
}

export async function DELETE(_request: Request, { params }: Params) {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!hasPermission(user.permissions || [], PERMISSIONS.AI_TOOLS_DELETE)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    await connectToDatabase();
    const tool = await AITool.findById(id);
    if (!tool) return NextResponse.json({ error: "Tool not found" }, { status: 404 });

    await tool.deleteOne();
    await logAiToolAction(user, "ai_tool.deleted", "AITool", id, { name: tool.name, slug: tool.slug });
    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error, "ai-tools/[id] DELETE");
  }
}
