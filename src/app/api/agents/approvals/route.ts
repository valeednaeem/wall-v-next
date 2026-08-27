import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { PERMISSIONS, hasPermission } from "@/lib/permissions";
import AgentApproval from "@/models/agent-approval";
import AgentAuditLog from "@/models/agent-audit-log";
import connectToDatabase from "@/lib/mongodb";

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!hasPermission(user.permissions || [], PERMISSIONS.AGENTS_APPROVE)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await connectToDatabase();
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") || "pending";
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");

    const query: Record<string, unknown> = {};
    if (status !== "all") query.status = status;

    const [approvals, total] = await Promise.all([
      AgentApproval.find(query)
        .populate("agent", "name slug role")
        .populate("requestedBy", "name email")
        .populate("reviewedBy", "name email")
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      AgentApproval.countDocuments(query),
    ]);

    return NextResponse.json({
      approvals,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to fetch approvals";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!hasPermission(user.permissions || [], PERMISSIONS.AGENTS_APPROVE)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await connectToDatabase();
    const body = await request.json();
    const { id, action, notes } = body;

    if (!id || !action) {
      return NextResponse.json({ error: "id and action are required" }, { status: 400 });
    }

    const approval = await AgentApproval.findById(id);
    if (!approval) {
      return NextResponse.json({ error: "Approval not found" }, { status: 404 });
    }

    if (action === "approve") {
      approval.status = "approved";
      approval.reviewedBy = user.userId;
      approval.reviewedAt = new Date();
      approval.notes = notes;
      await approval.save();

      await AgentAuditLog.create({
        agent: approval.agent,
        conversation: approval.conversation,
        execution: approval.execution,
        action: "approval-approved",
        category: "approval",
        description: `Approved ${approval.type}: ${approval.action.description}`,
        performedBy: user.userId,
        metadata: { approvalId: approval._id, type: approval.type },
      });

      return NextResponse.json({ approval, message: "Approved" });
    }

    if (action === "reject") {
      approval.status = "rejected";
      approval.reviewedBy = user.userId;
      approval.reviewedAt = new Date();
      approval.notes = notes;
      await approval.save();

      await AgentAuditLog.create({
        agent: approval.agent,
        conversation: approval.conversation,
        execution: approval.execution,
        action: "approval-rejected",
        category: "approval",
        description: `Rejected ${approval.type}: ${approval.action.description}`,
        performedBy: user.userId,
        metadata: { approvalId: approval._id, type: approval.type, reason: notes },
      });

      return NextResponse.json({ approval, message: "Rejected" });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to process approval";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
