import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import AITool from "@/models/ai-tool";
import { getAuthUser } from "@/lib/auth";
import { PERMISSIONS, hasPermission } from "@/lib/permissions";
import { aiToolSchema } from "@/lib/validations/ai-tool";
import { makeSlug, logAiToolAction } from "@/lib/tools/api-guard";
import { handleApiError } from "@/lib/api-middleware";

export async function GET(request: Request) {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!hasPermission(user.permissions || [], PERMISSIONS.AI_TOOLS_VIEW)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "20", 10)));
    const search = searchParams.get("search") || "";
    const status = searchParams.get("status") || "";
    const category = searchParams.get("category") || "";
    const accessModel = searchParams.get("accessModel") || "";
    const sort = searchParams.get("sort") || "-createdAt";

    await connectToDatabase();
    const filter: Record<string, unknown> = {};
    if (status) filter.status = status;
    if (category) filter.category = category;
    if (accessModel) filter.accessModel = accessModel;
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: "i" } },
        { slug: { $regex: search, $options: "i" } },
        { shortDescription: { $regex: search, $options: "i" } },
      ];
    }

    const allowedSorts = ["-createdAt", "createdAt", "name", "-name", "displayOrder", "-displayOrder"];
    const sortSpec = allowedSorts.includes(sort) ? sort : "-createdAt";

    const [data, total] = await Promise.all([
      AITool.find(filter)
        .populate("category", "name slug")
        .populate("tags", "name slug")
        .sort(sortSpec)
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      AITool.countDocuments(filter),
    ]);

    return NextResponse.json({
      success: true,
      data,
      pagination: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) },
    });
  } catch (error) {
    return handleApiError(error, "ai-tools GET");
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
    const parsed = aiToolSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ") },
        { status: 400 }
      );
    }

    await connectToDatabase();
    const input = parsed.data;
    const slug = input.slug ? makeSlug(input.slug) : makeSlug(input.name);

    const existing = await AITool.findOne({ slug });
    if (existing) {
      return NextResponse.json({ error: "A tool with this slug already exists" }, { status: 409 });
    }

    const doc: Record<string, unknown> = { ...input, slug };
    // Empty strings must not be cast to ObjectIds (Mongoose CastError)
    if (!input.requiredPlan) delete doc.requiredPlan;
    if (!input.aiConfig?.provider) {
      doc.aiConfig = { ...input.aiConfig, provider: undefined };
      delete (doc.aiConfig as Record<string, unknown>).provider;
    }

    const tool = await AITool.create({ ...doc, createdBy: user.userId });
    await logAiToolAction(user, "ai_tool.created", "AITool", String(tool._id), { name: tool.name, slug: tool.slug });

    return NextResponse.json({ success: true, data: tool }, { status: 201 });
  } catch (error) {
    return handleApiError(error, "ai-tools POST");
  }
}
