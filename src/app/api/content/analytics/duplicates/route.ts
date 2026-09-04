import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { handleApiError, requireRole } from "@/lib/api-middleware";
import { checkForDuplicates } from "@/lib/content-analytics";

export async function POST(request: Request) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const roleError = requireRole(user, ["super-admin", "admin", "manager"]);
    if (roleError) return roleError;

    const body = await request.json();

    if (!body.title || !body.primaryKeyword) {
      return NextResponse.json(
        { error: "Missing required fields: title, primaryKeyword" },
        { status: 400 }
      );
    }

    const result = await checkForDuplicates(
      body.title,
      body.primaryKeyword,
      body.campaignId
    );

    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    return handleApiError(error, "Content duplicates POST");
  }
}
