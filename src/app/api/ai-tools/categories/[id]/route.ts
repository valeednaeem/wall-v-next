import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import AIToolCategory from "@/models/ai-tool-category";
import AITool from "@/models/ai-tool";
import { getAuthUser } from "@/lib/auth";
import { PERMISSIONS, hasPermission } from "@/lib/permissions";
import { aiToolCategorySchema } from "@/lib/validations/ai-tool";
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
    const category = await AIToolCategory.findById(id).lean();
    if (!category) return NextResponse.json({ error: "Category not found" }, { status: 404 });
    return NextResponse.json({ success: true, data: category });
  } catch (error) {
    return handleApiError(error, "ai-tools categories/[id] GET");
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
    const parsed = aiToolCategorySchema.partial().safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ") },
        { status: 400 }
      );
    }

    await connectToDatabase();
    const category = await AIToolCategory.findById(id);
    if (!category) return NextResponse.json({ error: "Category not found" }, { status: 404 });

    delete (parsed.data as Record<string, unknown>).slug; // slug is immutable
    Object.assign(category, parsed.data);
    await category.save();

    await logAiToolAction(user, "ai_tool_category.updated", "AIToolCategory", id, { name: category.name });
    return NextResponse.json({ success: true, data: category });
  } catch (error) {
    return handleApiError(error, "ai-tools categories/[id] PUT");
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
    const category = await AIToolCategory.findById(id);
    if (!category) return NextResponse.json({ error: "Category not found" }, { status: 404 });

    const inUse = await AITool.countDocuments({ category: id });
    if (inUse > 0) {
      return NextResponse.json(
        { error: `Category is used by ${inUse} tool(s). Reassign them first.` },
        { status: 409 }
      );
    }

    await category.deleteOne();
    await logAiToolAction(user, "ai_tool_category.deleted", "AIToolCategory", id, { name: category.name });
    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error, "ai-tools categories/[id] DELETE");
  }
}
