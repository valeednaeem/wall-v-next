import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import AITool from "@/models/ai-tool";
import { handleApiError } from "@/lib/api-middleware";

const SAFE_SELECT =
  "name slug shortDescription description icon featuredImage category tags accessModel status features flags displayOrder visibility usagePolicy requiredPlan seo social createdAt updatedAt";

interface Params {
  params: Promise<{ slug: string }>;
}

export async function GET(_request: Request, { params }: Params) {
  try {
    const { slug } = await params;
    await connectToDatabase();
    const tool = await AITool.findOne({ slug, status: "published" })
      .select(SAFE_SELECT)
      .populate("category", "name slug")
      .populate("tags", "name slug")
      .lean();

    if (!tool) {
      return NextResponse.json({ error: "Tool not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: tool });
  } catch (error) {
    return handleApiError(error, "tools/[slug] GET");
  }
}
