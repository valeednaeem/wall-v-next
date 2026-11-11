import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { handleApiError, requireRole } from "@/lib/api-middleware";
import { findInternalLinks, getContentRelationships } from "@/lib/content-linking";

export async function POST(request: Request) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const roleError = requireRole(user, ["super-admin", "admin", "manager"]);
    if (roleError) return roleError;

    const body = await request.json();

    if (!body.content || !body.primaryKeyword) {
      return NextResponse.json(
        { error: "Missing required fields: content, primaryKeyword" },
        { status: 400 }
      );
    }

    const suggestions = await findInternalLinks(body.content, body.primaryKeyword);

    return NextResponse.json({ success: true, data: suggestions });
  } catch (error) {
    return handleApiError(error, "Content links POST");
  }
}

export async function GET(request: Request) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const roleError = requireRole(user, ["super-admin", "admin", "manager"]);
    if (roleError) return roleError;

    const { searchParams } = new URL(request.url);
    const campaignId = searchParams.get("campaignId") || undefined;

    const relationships = await getContentRelationships(campaignId);

    return NextResponse.json({ success: true, data: relationships });
  } catch (error) {
    return handleApiError(error, "Content links GET");
  }
}
