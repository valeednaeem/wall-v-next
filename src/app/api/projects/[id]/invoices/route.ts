import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import connectToDatabase from "@/lib/mongodb";
import Invoice from "@/models/invoice";
import Project from "@/models/project";
import { logProjectActivity } from "@/lib/activity-logger";
import { sendEmail, generateInvoiceEmail } from "@/lib/mail";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    await connectToDatabase();
    const { id } = await params;
    const invoices = await Invoice.find({ project: id })
      .populate("preparedBy", "name email")
      .sort({ createdAt: -1 });
    return NextResponse.json({ invoices });
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
    const { items, taxRate, discount, notes, terms, dueDays, type, quotationId } = body;

    if (!items || items.length === 0) {
      return NextResponse.json({ error: "Items are required" }, { status: 400 });
    }

    const project = await Project.findById(id);
    if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });

    const lineItems = items.map((item: { description: string; quantity: number; unitPrice: number; category?: string }) => ({
      description: item.description,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      total: item.quantity * item.unitPrice,
      category: item.category,
    }));
    const subtotal = lineItems.reduce((sum: number, item: { total: number }) => sum + item.total, 0);
    const taxAmount = subtotal * ((taxRate || 0) / 100);
    const total = subtotal + taxAmount - (discount || 0);

    const invCount = await Invoice.countDocuments();
    const invoiceNumber = `INV-${String(invCount + 1).padStart(5, "0")}`;

    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + (dueDays || 30));

    const invoice = await Invoice.create({
      invoiceNumber,
      client: project.clientRef || project.client,
      project: id,
      quotation: quotationId,
      items: lineItems,
      subtotal,
      tax: taxAmount,
      taxRate: taxRate || 0,
      discount: discount || 0,
      total,
      amountPaid: 0,
      amountDue: total,
      currency: project.currency || "USD",
      status: "draft",
      type: type || "standard",
      dueDate,
      notes,
      terms,
      preparedBy: user.userId,
    });

    project.financial.invoicedAmount += total;
    project.financial.outstandingAmount += total;
    project.lifecycleStatus = "invoiced";
    await project.save();

    await logProjectActivity({
      project: id, actor: user.userId, actorType: "user",
      action: "invoice-created", category: "invoice",
      description: `Created invoice ${invoiceNumber} for ${total} ${project.currency}`,
      entity: { model: "Invoice", id: invoice._id.toString() },
      after: { invoiceNumber, total },
    });

    // Send invoice email to client
    try {
      const populated = await Project.findById(id)
        .populate("clientRef", "name email")
        .lean();
      const clientEmail = (populated?.clientRef as { email?: string } | null)?.email ||
        (typeof populated?.client === "object" && populated?.client !== null ? (populated.client as { email?: string }).email : null);
      const clientName = (populated?.clientRef as { name?: string } | null)?.name || "Client";

      if (clientEmail) {
        const emailContent = generateInvoiceEmail({
          clientName,
          projectName: project.name,
          invoiceNumber,
          amount: total,
          currency: project.currency || "USD",
          dueDate: dueDate.toLocaleDateString(),
          invoiceId: invoice._id.toString(),
        });
        await sendEmail({ to: clientEmail, ...emailContent });
      }
    } catch {
      // Email failure should not block invoice creation
    }

    return NextResponse.json({ invoice }, { status: 201 });
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed" }, { status: 500 });
  }
}
