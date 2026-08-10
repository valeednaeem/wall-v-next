import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import Preview from "@/models/preview";
import { getAuthUser } from "@/lib/auth";
import { logError } from "@/lib/error-logger";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser();
    if (!user || !["super-admin", "admin", "manager"].includes(user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    await connectToDatabase();

    const preview = await Preview.findById(id)
      .select("accessLog projectId token status expiresAt accessCount maxAccesses")
      .populate("projectId", "name slug")
      .lean();

    if (!preview) {
      return NextResponse.json({ error: "Preview not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: {
        previewId: preview._id,
        project: preview.projectId,
        status: preview.status,
        expiresAt: preview.expiresAt,
        accessCount: preview.accessCount,
        maxAccesses: preview.maxAccesses,
        accessLog: preview.accessLog.sort(
          (a: { timestamp: string | Date }, b: { timestamp: string | Date }) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        ),
      },
    });
  } catch (error) {
    await logError({
      level: "error",
      message: "Error fetching preview access logs",
      source: "api/admin/previews/[id]/access-logs",
      stack: error instanceof Error ? error.stack : undefined,
    });
    return NextResponse.json({ error: "Failed to fetch access logs" }, { status: 500 });
  }
}
