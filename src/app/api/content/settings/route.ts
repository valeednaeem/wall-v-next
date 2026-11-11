import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { handleApiError, requireRole } from "@/lib/api-middleware";
import { connectToDatabase } from "@/lib/mongodb";
import { getContentSettings, updateContentSetting } from "@/lib/content-orchestrator";

export async function GET(request: Request) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectToDatabase();
    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category") || undefined;

    const settings = await getContentSettings(category);

    return NextResponse.json({ success: true, data: settings });
  } catch (error) {
    return handleApiError(error, "Content settings GET");
  }
}

export async function PUT(request: Request) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const roleError = requireRole(user, ["super-admin", "admin", "manager"]);
    if (roleError) return roleError;

    await connectToDatabase();
    const body = await request.json();

    if (!body.key || body.value === undefined || !body.category) {
      return NextResponse.json(
        { error: "Missing required fields: key, value, category" },
        { status: 400 }
      );
    }

    await updateContentSetting(body.key, body.value, body.category);

    return NextResponse.json({ success: true, message: "Setting updated" });
  } catch (error) {
    return handleApiError(error, "Content settings PUT");
  }
}
