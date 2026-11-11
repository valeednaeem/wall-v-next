import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { handleApiError, CONTENT_ROLES } from "@/lib/api-middleware";
import { connectToDatabase } from "@/lib/mongodb";
import PublicationJob from "@/models/publication-job";

const VALID_STATES = [
  "pending",
  "processing",
  "published",
  "retrying",
  "failed",
  "cancelled",
  "needs_review",
];

export async function GET(request: Request) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!CONTENT_ROLES.includes(user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await connectToDatabase();

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(
      100,
      Math.max(1, parseInt(searchParams.get("limit") || "20", 10))
    );

    const query: Record<string, unknown> = {};
    const state = searchParams.get("state");
    const platform = searchParams.get("platform");
    const contentType = searchParams.get("contentType");

    if (state && VALID_STATES.includes(state)) query.state = state;
    if (platform) query.platform = platform;
    if (contentType === "blog" || contentType === "content-item") {
      query.contentType = contentType;
    }

    const [jobs, total, summaryRaw] = await Promise.all([
      PublicationJob.find(query)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      PublicationJob.countDocuments(query),
      PublicationJob.aggregate<{ _id: string; count: number }>([
        { $group: { _id: "$state", count: { $sum: 1 } } },
      ]),
    ]);

    const summary: Record<string, number> = {};
    for (const row of summaryRaw) {
      summary[row._id] = row.count;
    }

    return NextResponse.json({
      success: true,
      data: jobs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      summary,
    });
  } catch (error) {
    return handleApiError(error, "Social jobs list");
  }
}
