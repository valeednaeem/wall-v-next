import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import AIToolProvider from "@/models/ai-tool-provider";
import { getAuthUser } from "@/lib/auth";
import { PERMISSIONS, hasPermission } from "@/lib/permissions";
import { aiToolProviderSchema } from "@/lib/validations/ai-tool";
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
    const providers = await AIToolProvider.find({}).sort({ isDefault: -1, name: 1 }).lean();
    // Never expose key values — only whether the env var is configured
    const data = providers.map((p) => ({
      ...p,
      configured: p.envKeyName ? Boolean(process.env[p.envKeyName]) : false,
    }));
    return NextResponse.json({ success: true, data });
  } catch (error) {
    return handleApiError(error, "ai-tools providers GET");
  }
}

export async function POST(request: Request) {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!hasPermission(user.permissions || [], PERMISSIONS.AI_TOOLS_PROVIDERS)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const parsed = aiToolProviderSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ") },
        { status: 400 }
      );
    }

    await connectToDatabase();
    const slug = parsed.data.slug ? makeSlug(parsed.data.slug) : makeSlug(parsed.data.name);
    const existing = await AIToolProvider.findOne({ slug });
    if (existing) return NextResponse.json({ error: "Provider with this slug already exists" }, { status: 409 });

    if (parsed.data.isDefault) {
      await AIToolProvider.updateMany({}, { $set: { isDefault: false } });
    }
    const provider = await AIToolProvider.create({ ...parsed.data, slug });
    await logAiToolAction(user, "ai_tool_provider.created", "AIToolProvider", String(provider._id), { name: provider.name });
    return NextResponse.json({ success: true, data: provider }, { status: 201 });
  } catch (error) {
    return handleApiError(error, "ai-tools providers POST");
  }
}
