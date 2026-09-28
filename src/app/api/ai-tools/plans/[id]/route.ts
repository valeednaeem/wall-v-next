import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import AIToolPlan from "@/models/ai-tool-plan";
import AITool from "@/models/ai-tool";
import { getAuthUser } from "@/lib/auth";
import { PERMISSIONS, hasPermission } from "@/lib/permissions";
import { aiToolPlanSchema } from "@/lib/validations/ai-tool";
import { logAiToolAction } from "@/lib/tools/api-guard";
import { handleApiError } from "@/lib/api-middleware";

interface Params {
  params: Promise<{ id: string }>;
}

export async function PUT(request: Request, { params }: Params) {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!hasPermission(user.permissions || [], PERMISSIONS.AI_TOOLS_PRICING)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const parsed = aiToolPlanSchema.partial().safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ") },
        { status: 400 }
      );
    }

    await connectToDatabase();
    const plan = await AIToolPlan.findById(id);
    if (!plan) return NextResponse.json({ error: "Plan not found" }, { status: 404 });

    const before = { monthlyPrice: plan.monthlyPrice, yearlyPrice: plan.yearlyPrice, name: plan.name };
    delete (parsed.data as Record<string, unknown>).slug;
    Object.assign(plan, parsed.data);
    await plan.save();

    await logAiToolAction(user, "ai_tool_plan.updated", "AIToolPlan", id, { before, after: parsed.data });
    return NextResponse.json({ success: true, data: plan });
  } catch (error) {
    return handleApiError(error, "ai-tools plans/[id] PUT");
  }
}

export async function DELETE(_request: Request, { params }: Params) {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!hasPermission(user.permissions || [], PERMISSIONS.AI_TOOLS_PRICING)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    await connectToDatabase();
    const plan = await AIToolPlan.findById(id);
    if (!plan) return NextResponse.json({ error: "Plan not found" }, { status: 404 });

    const inUse = await AITool.countDocuments({ requiredPlan: id });
    if (inUse > 0) {
      return NextResponse.json({ error: `Plan is required by ${inUse} tool(s).` }, { status: 409 });
    }

    await plan.deleteOne();
    await logAiToolAction(user, "ai_tool_plan.deleted", "AIToolPlan", id, { name: plan.name });
    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error, "ai-tools plans/[id] DELETE");
  }
}
