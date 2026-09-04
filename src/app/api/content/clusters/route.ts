import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { handleApiError, requireRole } from "@/lib/api-middleware";
import {
  organizeCampaignClusters,
  assessTopicalAuthority,
} from "@/lib/content-campaign-intelligence";

export async function GET(request: Request) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const roleError = requireRole(user, ["super-admin", "admin", "manager"]);
    if (roleError) return roleError;

    const { searchParams } = new URL(request.url);
    const campaignId = searchParams.get("campaignId");

    if (!campaignId) {
      return NextResponse.json(
        { error: "Missing required query parameter: campaignId" },
        { status: 400 }
      );
    }

    const report = await assessTopicalAuthority(campaignId);

    return NextResponse.json({ success: true, data: report });
  } catch (error) {
    return handleApiError(error, "Content clusters GET");
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

    if (!body.campaignId) {
      return NextResponse.json(
        { error: "Missing required field: campaignId" },
        { status: 400 }
      );
    }

    const clusters = await organizeCampaignClusters(body.campaignId);

    return NextResponse.json({ success: true, data: clusters });
  } catch (error) {
    return handleApiError(error, "Content clusters POST");
  }
}
