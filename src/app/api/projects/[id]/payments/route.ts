import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import connectToDatabase from "@/lib/mongodb";
import ProjectPayment from "@/models/project-payment";
import Invoice from "@/models/invoice";
import Project from "@/models/project";
import { logProjectActivity } from "@/lib/activity-logger";
import { sendEmail, generatePaymentConfirmationEmail } from "@/lib/mail";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    await connectToDatabase();
    const { id } = await params;
    const payments = await ProjectPayment.find({ project: id })
      .populate("recordedBy", "name email")
      .sort({ createdAt: -1 });
    return NextResponse.json({ payments });
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
    const { amount, type, method, invoiceId, reference, notes } = body;

    if (!amount || amount <= 0) {
      return NextResponse.json({ error: "Valid amount required" }, { status: 400 });
    }

    const project = await Project.findById(id);
    if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });

    const payment = await ProjectPayment.create({
      project: id,
      invoice: invoiceId,
      amount,
      currency: project.currency || "USD",
      type: type || "partial",
      status: "completed",
      method,
      reference,
      notes,
      paidAt: new Date(),
      recordedBy: user.userId,
    });

    // Update project financials
    project.financial.paidAmount += amount;
    project.financial.outstandingAmount = Math.max(0, project.financial.outstandingAmount - amount);
    project.paymentStatus = project.financial.outstandingAmount <= 0 ? "paid" : "partial";
    await project.save();

    // Update invoice if linked
    if (invoiceId) {
      const invoice = await Invoice.findById(invoiceId);
      if (invoice) {
        invoice.amountPaid += amount;
        invoice.amountDue = Math.max(0, invoice.total - invoice.amountPaid);
        invoice.status = invoice.amountDue <= 0 ? "paid" : "partially-paid";
        if (invoice.amountPaid > 0) invoice.paidAt = new Date();
        await invoice.save();
      }
    }

    project.lifecycleStatus = "paid";
    await project.save();

    await logProjectActivity({
      project: id, actor: user.userId, actorType: "user",
      action: "payment-received", category: "payment",
      description: `Payment of ${amount} ${project.currency} received (${type})`,
      entity: { model: "ProjectPayment", id: payment._id.toString() },
      after: { amount, type, method },
    });

    // Send payment confirmation email
    try {
      const populated = await Project.findById(id)
        .populate("clientRef", "name email")
        .lean();
      const clientEmail = (populated?.clientRef as { email?: string } | null)?.email ||
        (typeof populated?.client === "object" && populated?.client !== null ? (populated.client as { email?: string }).email : null);
      const clientName = (populated?.clientRef as { name?: string } | null)?.name || "Client";

      if (clientEmail) {
        const emailContent = generatePaymentConfirmationEmail({
          clientName,
          projectName: project.name,
          amount,
          currency: project.currency || "USD",
          paymentId: payment._id.toString(),
        });
        await sendEmail({ to: clientEmail, ...emailContent });
      }
    } catch {
      // Email failure should not block payment recording
    }

    return NextResponse.json({ payment }, { status: 201 });
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed" }, { status: 500 });
  }
}
