import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import connectToDatabase from "@/lib/mongodb";
import ChangeRequest from "@/models/change-request";
import Project from "@/models/project";
import { logProjectActivity } from "@/lib/activity-logger";
import { sendEmail, generateChangeRequestEmail } from "@/lib/mail";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    await connectToDatabase();
    const { id } = await params;
    const changeRequests = await ChangeRequest.find({ project: id })
      .populate("requestedBy", "name email")
      .populate("reviewedBy", "name email")
      .sort({ createdAt: -1 });
    return NextResponse.json({ changeRequests });
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed" }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    await connectToDatabase();
    const { id } = await params;
    const body = await request.json();
    const { title, description, type, reason, impact, estimatedCost, estimatedDays } = body;
    if (!title || !description || !reason) {
      return NextResponse.json({ error: "Title, description, and reason are required" }, { status: 400 });
    }
    const changeRequest = await ChangeRequest.create({
      project: id, title, description, type: type || "scope",
      reason, impact: impact || {}, estimatedCost, estimatedDays,
      requestedBy: user.userId,
      clientApproval: { required: true, status: "pending" },
    });
    await Project.findByIdAndUpdate(id, { $push: { changeRequests: changeRequest._id } });
    await logProjectActivity({
      project: id, actor: user.userId, actorType: "user",
      action: "change-request-created", category: "change-request",
      description: `Created change request: "${title}"`,
      entity: { model: "ChangeRequest", id: changeRequest._id.toString() },
    });
    return NextResponse.json({ changeRequest }, { status: 201 });
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed" }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    await connectToDatabase();
    const { id } = await params;
    const body = await request.json();
    const { changeRequestId, action, reviewNotes } = body;
    if (!changeRequestId || !action) {
      return NextResponse.json({ error: "changeRequestId and action required" }, { status: 400 });
    }
    const cr = await ChangeRequest.findById(changeRequestId);
    if (!cr) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (action === "submit") { cr.status = "submitted"; }
    else if (action === "approve") {
      cr.status = "approved"; cr.reviewedBy = user.userId;
      cr.reviewedAt = new Date(); cr.reviewNotes = reviewNotes;
    } else if (action === "reject") {
      cr.status = "rejected"; cr.reviewedBy = user.userId;
      cr.reviewedAt = new Date(); cr.reviewNotes = reviewNotes;
    } else if (action === "implement") {
      cr.status = "implemented"; cr.implementedBy = user.userId;
      cr.implementedAt = new Date();
    }
    await cr.save();
    await logProjectActivity({
      project: id, actor: user.userId, actorType: "user",
      action: `change-request-${action}`, category: "change-request",
      description: `Change request "${cr.title}" ${action}ed`,
      entity: { model: "ChangeRequest", id: cr._id.toString() },
    });

    // Send email notification for submitted, approved, or rejected change requests
    if (["submit", "approve", "reject"].includes(action)) {
      try {
        const populated = await Project.findById(id)
          .populate("clientRef", "name email")
          .lean();
        const clientEmail = (populated?.clientRef as { email?: string } | null)?.email ||
          (typeof populated?.client === "object" && populated?.client !== null ? (populated.client as { email?: string }).email : null);
        const clientName = (populated?.clientRef as { name?: string } | null)?.name || "Client";

        if (clientEmail) {
          const emailContent = generateChangeRequestEmail({
            clientName,
            projectName: populated?.name || "Project",
            changeTitle: cr.title,
            changeType: cr.type,
            status: action === "submit" ? "submitted" : action === "approve" ? "approved" : "rejected",
          });
          await sendEmail({ to: clientEmail, ...emailContent });
        }
      } catch {
        // Email failure should not block change request update
      }
    }
    return NextResponse.json({ changeRequest: cr });
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed" }, { status: 500 });
  }
}
