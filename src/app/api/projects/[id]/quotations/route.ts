import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import connectToDatabase from "@/lib/mongodb";
import Quote from "@/models/quote";
import Project from "@/models/project";
import { logProjectActivity } from "@/lib/activity-logger";
import { sendEmail, generateQuotationEmail } from "@/lib/mail";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    await connectToDatabase();
    const { id } = await params;
    const quotations = await Quote.find({ project: id })
      .populate("preparedBy", "name email")
      .populate("approvedBy", "name email")
      .sort({ createdAt: -1 });
    return NextResponse.json({ quotations });
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
    const { items, taxRate, discount, notes, terms, validDays } = body;

    if (!items || items.length === 0) {
      return NextResponse.json({ error: "Items are required" }, { status: 400 });
    }

    const project = await Project.findById(id);
    if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });

    // Calculate totals
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

    const refCount = await Quote.countDocuments();
    const reference = `Q-${String(refCount + 1).padStart(5, "0")}`;

    const validUntil = new Date();
    validUntil.setDate(validUntil.getDate() + (validDays || 30));

    const quote = await Quote.create({
      reference,
      project: id,
      client: typeof project.client === "object" && project.clientRef ? project.clientRef : undefined,
      items: lineItems,
      subtotal,
      tax: taxAmount,
      taxRate: taxRate || 0,
      discount: discount || 0,
      total,
      currency: project.currency || "USD",
      status: "draft",
      validUntil,
      notes,
      terms,
      preparedBy: user.userId,
    });

    // Update project financial
    project.financial.quotedAmount = total;
    project.quote = { min: total * 0.8, max: total, currency: project.currency || "USD" };
    await project.save();

    await logProjectActivity({
      project: id, actor: user.userId, actorType: "user",
      action: "quotation-created", category: "quotation",
      description: `Created quotation ${reference} for ${total} ${project.currency}`,
      entity: { model: "Quote", id: quote._id.toString() },
      after: { reference, total, currency: project.currency },
    });

    // Send quotation email to client
    try {
      const populated = await Project.findById(id)
        .populate("clientRef", "name email")
        .lean();
      const clientEmail = (populated?.clientRef as { email?: string } | null)?.email ||
        (typeof populated?.client === "object" && populated?.client !== null ? (populated.client as { email?: string }).email : null);
      const clientName = (populated?.clientRef as { name?: string } | null)?.name || "Client";

      if (clientEmail) {
        const emailContent = generateQuotationEmail({
          clientName,
          projectName: project.name,
          quoteNumber: reference,
          amount: total,
          currency: project.currency || "USD",
          validUntil: validUntil.toLocaleDateString(),
        });
        await sendEmail({ to: clientEmail, ...emailContent });
      }
    } catch {
      // Email failure should not block quotation creation
    }

    return NextResponse.json({ quote }, { status: 201 });
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
    const { quoteId, action } = body;
    if (!quoteId || !action) {
      return NextResponse.json({ error: "quoteId and action required" }, { status: 400 });
    }
    const quote = await Quote.findById(quoteId);
    if (!quote) return NextResponse.json({ error: "Not found" }, { status: 404 });

    if (action === "send") { quote.status = "sent"; quote.sentAt = new Date(); }
    else if (action === "approve") {
      quote.status = "accepted"; quote.acceptedAt = new Date();
      quote.approvedBy = user.userId;
      const project = await Project.findById(id);
      if (project) {
        project.financial.approvedAmount = quote.total;
        project.lifecycleStatus = "scope-approved";
        await project.save();
      }
    } else if (action === "reject") {
      quote.status = "rejected"; quote.rejectedAt = new Date();
      quote.rejectedReason = body.reason;
    } else if (action === "internal-review") {
      quote.status = "internal-review";
    }
    await quote.save();

    await logProjectActivity({
      project: id, actor: user.userId, actorType: "user",
      action: `quotation-${action}`, category: "quotation",
      description: `Quotation ${quote.reference} ${action}ed`,
      entity: { model: "Quote", id: quote._id.toString() },
    });

    return NextResponse.json({ quote });
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed" }, { status: 500 });
  }
}
