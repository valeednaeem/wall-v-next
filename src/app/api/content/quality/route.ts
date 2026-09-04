import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { handleApiError, requireRole } from "@/lib/api-middleware";
import { runQualityPipeline } from "@/lib/content-quality";

export async function POST(request: Request) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const roleError = requireRole(user, ["super-admin", "admin", "manager"]);
    if (roleError) return roleError;

    const body = await request.json();

    if (!body.itemId) {
      return NextResponse.json(
        { error: "Missing required field: itemId" },
        { status: 400 }
      );
    }

    const validChecks = ["factCheck", "seoReview", "brandReview", "conversionReview"];
    const checks = body.checks?.filter((c: string) => validChecks.includes(c));

    const result = await runQualityPipeline(body.itemId, checks);

    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    return handleApiError(error, "Content quality POST");
  }
}
