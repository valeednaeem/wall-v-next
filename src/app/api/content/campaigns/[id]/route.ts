import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { handleApiError, requireRole } from "@/lib/api-middleware";
import { connectToDatabase } from "@/lib/mongodb";
import { getCampaign, pauseCampaign, cancelCampaign } from "@/lib/content-orchestrator";
import ContentCampaign from "@/models/content-campaign";

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

    const campaign = await getCampaign(id);

    return NextResponse.json({ success: true, data: campaign });
  } catch (error) {
    return handleApiError(error, "Campaign GET");
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
      "name", "description", "businessObjectives", "targetAudience",
      "contentPillars", "productServicePriorities", "dateRange",
    ];
    const updates: Record<string, unknown> = {};
    for (const field of allowedFields) {
      if (field in body) {
        updates[field] = body[field];
      }
    }

    if (updates.dateRange) {
      const dr = updates.dateRange as { start: string; end: string };
      updates.dateRange = {
        start: new Date(dr.start),
        end: new Date(dr.end),
      };
    }

    const action = body.action;
    let campaign;

    if (action === "pause") {
      campaign = await pauseCampaign(id);
    } else if (action === "cancel") {
      campaign = await cancelCampaign(id);
    } else {
      campaign = await ContentCampaign.findByIdAndUpdate(id, updates, { new: true }).lean();
      if (!campaign) {
        return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
      }
    }

    return NextResponse.json({ success: true, data: campaign });
  } catch (error) {
    return handleApiError(error, "Campaign PUT");
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

    const campaign = await ContentCampaign.findByIdAndDelete(id).lean();
    if (!campaign) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: "Campaign deleted" });
  } catch (error) {
    return handleApiError(error, "Campaign DELETE");
  }
}
