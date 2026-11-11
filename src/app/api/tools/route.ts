import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import AITool from "@/models/ai-tool";
import AIToolCategory from "@/models/ai-tool-category";
import { handleApiError } from "@/lib/api-middleware";

const SAFE_SELECT =
  "name slug shortDescription description icon featuredImage category tags accessModel status features flags displayOrder visibility usagePolicy.dailyLimit usagePolicy.monthlyLimit usagePolicy.lifetimeFreeExecutions usagePolicy.creditsPerExecution usagePolicy.maxInputLength usagePolicy.maxOutputLength requiredPlan createdAt updatedAt";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search")?.trim();
    const category = searchParams.get("category")?.trim();
    const accessModel = searchParams.get("accessModel")?.trim();
    const page = Math.max(1, Number(searchParams.get("page")) || 1);
    const limit = Math.min(100, Math.max(1, Number(searchParams.get("limit")) || 24));

    const filter: Record<string, unknown> = {
      status: "published",
      "visibility.toolsPage": true,
    };
    if (category) {
      await connectToDatabase();
      const cat = await AIToolCategory.findOne({ slug: category }).select("_id").lean();
      if (!cat) {
        return NextResponse.json({ success: true, data: [], pagination: { page, limit, total: 0, pages: 1 } });
      }
      filter.category = String(cat._id);
    }
    if (accessModel && ["free", "freemium", "subscription"].includes(accessModel)) {
      filter.accessModel = accessModel;
    }
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: "i" } },
        { shortDescription: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
      ];
    }

    await connectToDatabase();
    const [tools, total] = await Promise.all([
      AITool.find(filter)
        .select(SAFE_SELECT)
        .populate("category", "name slug")
        .sort({ displayOrder: 1, createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      AITool.countDocuments(filter),
    ]);

    return NextResponse.json({
      success: true,
      data: tools,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit) || 1,
      },
    });
  } catch (error) {
    return handleApiError(error, "tools GET");
  }
}
