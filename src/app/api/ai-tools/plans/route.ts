import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import AIToolPlan from "@/models/ai-tool-plan";
import { getAuthUser } from "@/lib/auth";
import { PERMISSIONS, hasPermission } from "@/lib/permissions";
import { aiToolPlanSchema } from "@/lib/validations/ai-tool";
import { makeSlug, logAiToolAction } from "@/lib/tools/api-guard";
import { handleApiError } from "@/lib/api-middleware";

export async function GET() {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!hasPermission(user.permissions || [], PERMISSIONS.AI_TOOLS_VIEW)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    await connectToDatabase();
    const plans = await AIToolPlan.find({}).sort({ sortOrder: 1 }).lean();
    return NextResponse.json({ success: true, data: plans });
  } catch (error) {
    return handleApiError(error, "ai-tools plans GET");
  }
}

export async function POST(request: Request) {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!hasPermission(user.permissions || [], PERMISSIONS.AI_TOOLS_PRICING)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const parsed = aiToolPlanSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ") },
        { status: 400 }
      );
    }

    await connectToDatabase();
    const slug = parsed.data.slug ? makeSlug(parsed.data.slug) : makeSlug(parsed.data.name);
    const existing = await AIToolPlan.findOne({ slug });
    if (existing) return NextResponse.json({ error: "Plan with this slug already exists" }, { status: 409 });

    const plan = await AIToolPlan.create({ ...parsed.data, slug });
    await logAiToolAction(user, "ai_tool_plan.created", "AIToolPlan", String(plan._id), { name: plan.name, monthlyPrice: plan.monthlyPrice });
    return NextResponse.json({ success: true, data: plan }, { status: 201 });
  } catch (error) {
    return handleApiError(error, "ai-tools plans POST");
  }
}
