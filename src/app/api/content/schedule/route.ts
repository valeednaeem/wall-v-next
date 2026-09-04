import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { handleApiError } from "@/lib/api-middleware";
import { getUpcomingSchedule, scheduleContent } from "@/lib/content-scheduler";

export async function GET(request: Request) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get("days") || "7");

    const schedule = await getUpcomingSchedule(days);

    return NextResponse.json({
      success: true,
      data: schedule,
      days,
    });
  } catch (error) {
    return handleApiError(error, "Content schedule GET");
  }
}

export async function POST(request: Request) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { contentItemId, scheduledAt } = body;

    if (!contentItemId || !scheduledAt) {
      return NextResponse.json(
        { error: "contentItemId and scheduledAt are required" },
        { status: 400 }
      );
    }

    const scheduledDate = new Date(scheduledAt);
    if (isNaN(scheduledDate.getTime())) {
      return NextResponse.json(
        { error: "Invalid scheduledAt date" },
        { status: 400 }
      );
    }

    await scheduleContent(contentItemId, scheduledDate);

    return NextResponse.json({
      success: true,
      message: "Content scheduled successfully",
      scheduledAt: scheduledDate.toISOString(),
    });
  } catch (error) {
    return handleApiError(error, "Content schedule POST");
  }
}
