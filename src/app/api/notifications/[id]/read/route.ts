import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { markAsRead } from "@/lib/notify";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const result = await markAsRead(id, user.userId);

    if (!result) {
      return NextResponse.json({ error: "Notification not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    console.error("Notification read error:", error);
    return NextResponse.json({ error: "Failed to mark notification as read" }, { status: 500 });
  }
}
