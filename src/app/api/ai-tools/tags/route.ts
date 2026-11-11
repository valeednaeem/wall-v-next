import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import AIToolTag from "@/models/ai-tool-tag";
import { getAuthUser } from "@/lib/auth";
import { PERMISSIONS, hasPermission } from "@/lib/permissions";
import { aiToolTagSchema } from "@/lib/validations/ai-tool";
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
    const tags = await AIToolTag.find({}).sort({ name: 1 }).lean();
    return NextResponse.json({ success: true, data: tags });
  } catch (error) {
    return handleApiError(error, "ai-tools tags GET");
  }
}

export async function POST(request: Request) {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!hasPermission(user.permissions || [], PERMISSIONS.AI_TOOLS_EDIT)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const parsed = aiToolTagSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    await connectToDatabase();
    const slug = makeSlug(parsed.data.name);
    const existing = await AIToolTag.findOne({ slug });
    if (existing) return NextResponse.json({ error: "Tag already exists" }, { status: 409 });

    const tag = await AIToolTag.create({ name: parsed.data.name, slug });
    await logAiToolAction(user, "ai_tool_tag.created", "AIToolTag", String(tag._id), { name: tag.name });
    return NextResponse.json({ success: true, data: tag }, { status: 201 });
  } catch (error) {
    return handleApiError(error, "ai-tools tags POST");
  }
}

export async function DELETE(request: Request) {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!hasPermission(user.permissions || [], PERMISSIONS.AI_TOOLS_EDIT)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });

    await connectToDatabase();
    const tag = await AIToolTag.findById(id);
    if (!tag) return NextResponse.json({ error: "Tag not found" }, { status: 404 });
    await tag.deleteOne();
    await logAiToolAction(user, "ai_tool_tag.deleted", "AIToolTag", id, { name: tag.name });
    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error, "ai-tools tags DELETE");
  }
}
