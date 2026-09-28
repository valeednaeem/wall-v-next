import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import AIToolProvider from "@/models/ai-tool-provider";
import AITool from "@/models/ai-tool";
import { getAuthUser } from "@/lib/auth";
import { PERMISSIONS, hasPermission } from "@/lib/permissions";
import { aiToolProviderSchema } from "@/lib/validations/ai-tool";
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
    const provider = await AIToolProvider.findById(id).lean();
    if (!provider) return NextResponse.json({ error: "Provider not found" }, { status: 404 });
    return NextResponse.json({
      success: true,
      data: {
        ...provider,
        configured: provider.envKeyName ? Boolean(process.env[provider.envKeyName]) : false,
      },
    });
  } catch (error) {
    return handleApiError(error, "ai-tools providers/[id] GET");
  }
}

export async function PUT(request: Request, { params }: Params) {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!hasPermission(user.permissions || [], PERMISSIONS.AI_TOOLS_PROVIDERS)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const parsed = aiToolProviderSchema.partial().safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ") },
        { status: 400 }
      );
    }

    await connectToDatabase();
    const provider = await AIToolProvider.findById(id);
    if (!provider) return NextResponse.json({ error: "Provider not found" }, { status: 404 });

    if (parsed.data.isDefault) {
      await AIToolProvider.updateMany({ _id: { $ne: id } }, { $set: { isDefault: false } });
    }
    delete (parsed.data as Record<string, unknown>).slug;
    Object.assign(provider, parsed.data);
    await provider.save();

    await logAiToolAction(user, "ai_tool_provider.updated", "AIToolProvider", id, { name: provider.name });
    return NextResponse.json({
      success: true,
      data: { ...(provider.toObject() as Record<string, unknown>), configured: provider.envKeyName ? Boolean(process.env[provider.envKeyName]) : false },
    });
  } catch (error) {
    return handleApiError(error, "ai-tools providers/[id] PUT");
  }
}

export async function DELETE(_request: Request, { params }: Params) {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!hasPermission(user.permissions || [], PERMISSIONS.AI_TOOLS_PROVIDERS)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    await connectToDatabase();
    const provider = await AIToolProvider.findById(id);
    if (!provider) return NextResponse.json({ error: "Provider not found" }, { status: 404 });

    const inUse = await AITool.countDocuments({ "aiConfig.provider": id });
    if (inUse > 0) {
      return NextResponse.json({ error: `Provider is used by ${inUse} tool(s).` }, { status: 409 });
    }

    await provider.deleteOne();
    await logAiToolAction(user, "ai_tool_provider.deleted", "AIToolProvider", id, { name: provider.name });
    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error, "ai-tools providers/[id] DELETE");
  }
}
