import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { handleApiError, requireRole } from "@/lib/api-middleware";
import { connectToDatabase } from "@/lib/mongodb";
import {
  createCampaign,
  listCampaigns,
} from "@/lib/content-orchestrator";

export async function GET(request: Request) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectToDatabase();
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") || undefined;

    const campaigns = await listCampaigns(status);

    return NextResponse.json({ success: true, data: campaigns });
  } catch (error) {
    return handleApiError(error, "Content campaigns GET");
  }
}

export async function POST(request: Request) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const roleError = requireRole(user, ["super-admin", "admin", "manager"]);
    if (roleError) return roleError;

    const body = await request.json();

    if (!body.name || !body.businessObjectives || !body.targetAudience || !body.contentPillars || !body.dateRange) {
      return NextResponse.json(
        { error: "Missing required fields: name, businessObjectives, targetAudience, contentPillars, dateRange" },
        { status: 400 }
      );
    }

    const campaign = await createCampaign({
      name: body.name,
      description: body.description,
      businessObjectives: body.businessObjectives,
      targetAudience: body.targetAudience,
      contentPillars: body.contentPillars,
      dateRange: body.dateRange,
      productServicePriorities: body.productServicePriorities,
    });

    return NextResponse.json({ success: true, data: campaign }, { status: 201 });
  } catch (error) {
    return handleApiError(error, "Content campaigns POST");
  }
}
