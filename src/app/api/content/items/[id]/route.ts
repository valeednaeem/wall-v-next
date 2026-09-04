import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { handleApiError, requireRole } from "@/lib/api-middleware";
import { connectToDatabase } from "@/lib/mongodb";
import ContentItem, { type IContentItem } from "@/models/content-item";
import { updateContentItem } from "@/lib/content-orchestrator";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectToDatabase();
    const { id } = await params;

    const item = await ContentItem.findById(id)
      .populate("campaign", "name slug status")
      .populate("topic", "title slug primaryKeyword")
      .populate("plan", "weekNumber version status")
      .populate("approvedBy", "name email")
      .lean();

    if (!item) {
      return NextResponse.json({ error: "Content item not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: item });
  } catch (error) {
    return handleApiError(error, "Content item GET");
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const roleError = requireRole(user, ["super-admin", "admin", "manager"]);
    if (roleError) return roleError;

    await connectToDatabase();
    const { id } = await params;
    const body = await request.json();

    const allowedFields = [
      "title", "content", "excerpt", "featuredImage", "seo",
      "status", "platform", "type", "scheduledAt", "approvalRequired",
      "socialVariants", "videoScript", "internalLinks", "externalLinks",
    ];
    const updates: Record<string, unknown> = {};
    for (const field of allowedFields) {
      if (field in body) {
        updates[field] = body[field];
      }
    }

    const item = await updateContentItem(id, updates as Partial<IContentItem>);

    return NextResponse.json({ success: true, data: item });
  } catch (error) {
    return handleApiError(error, "Content item PUT");
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const roleError = requireRole(user, ["super-admin", "admin"]);
    if (roleError) return roleError;

    await connectToDatabase();
    const { id } = await params;

    const item = await ContentItem.findByIdAndDelete(id).lean();
    if (!item) {
      return NextResponse.json({ error: "Content item not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: "Content item deleted" });
  } catch (error) {
    return handleApiError(error, "Content item DELETE");
  }
}
