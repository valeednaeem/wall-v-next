import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import AIToolCategory from "@/models/ai-tool-category";
import AITool from "@/models/ai-tool";
import { getAuthUser } from "@/lib/auth";
import { PERMISSIONS, hasPermission } from "@/lib/permissions";
import { aiToolCategorySchema } from "@/lib/validations/ai-tool";
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
    const categories = await AIToolCategory.find({}).sort({ sortOrder: 1, name: 1 }).lean();
    const counts = await AITool.aggregate([
      { $match: { status: "published" } },
      { $group: { _id: "$category", count: { $sum: 1 } } },
    ]);
    const countMap = new Map(counts.map((c: { _id: string; count: number }) => [String(c._id), c.count]));

    return NextResponse.json({
      success: true,
      data: categories.map((c) => ({ ...c, toolCount: countMap.get(String(c._id)) || 0 })),
    });
  } catch (error) {
    return handleApiError(error, "ai-tools categories GET");
  }
}

export async function POST(request: Request) {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!hasPermission(user.permissions || [], PERMISSIONS.AI_TOOLS_CREATE)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const parsed = aiToolCategorySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ") },
        { status: 400 }
      );
    }

    await connectToDatabase();
    const slug = parsed.data.slug ? makeSlug(parsed.data.slug) : makeSlug(parsed.data.name);
    const existing = await AIToolCategory.findOne({ slug });
    if (existing) return NextResponse.json({ error: "Category with this slug already exists" }, { status: 409 });

    const category = await AIToolCategory.create({ ...parsed.data, slug });
    await logAiToolAction(user, "ai_tool_category.created", "AIToolCategory", String(category._id), { name: category.name });
    return NextResponse.json({ success: true, data: category }, { status: 201 });
  } catch (error) {
    return handleApiError(error, "ai-tools categories POST");
  }
}
