import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import Invoice from "@/models/invoice";
import Quote from "@/models/quote";
import ProjectPayment from "@/models/project-payment";
import { auth } from "@/lib/auth";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    await connectToDatabase();

    const [invoices, quotations, payments] = await Promise.all([
      Invoice.find({})
        .populate("client", "name email company")
        .populate("project", "name")
        .sort({ createdAt: -1 })
        .lean(),
      Quote.find({})
        .populate("client", "name email company")
        .populate("project", "name")
        .sort({ createdAt: -1 })
        .lean(),
      ProjectPayment.find({})
        .populate("project", "name")
        .populate("invoice", "invoiceNumber")
        .sort({ createdAt: -1 })
        .lean(),
    ]);

    const invoiceStats = {
      total: invoices.length,
      draft: invoices.filter((i) => i.status === "draft").length,
      sent: invoices.filter((i) => i.status === "sent").length,
      paid: invoices.filter((i) => i.status === "paid").length,
      overdue: invoices.filter((i) => i.status === "overdue").length,
      totalAmount: invoices.reduce((sum, i) => sum + (i.total || 0), 0),
      totalPaid: invoices.reduce((sum, i) => sum + (i.amountPaid || 0), 0),
      totalDue: invoices.reduce((sum, i) => sum + (i.amountDue || 0), 0),
    };

    const quotationStats = {
      total: quotations.length,
      draft: quotations.filter((q) => q.status === "draft").length,
      sent: quotations.filter((q) => q.status === "sent").length,
      accepted: quotations.filter((q) => q.status === "accepted").length,
      rejected: quotations.filter((q) => q.status === "rejected").length,
      totalAmount: quotations.reduce((sum, q) => sum + (q.total || 0), 0),
    };

    const paymentStats = {
      total: payments.length,
      completed: payments.filter((p) => p.status === "completed").length,
      pending: payments.filter((p) => p.status === "pending").length,
      totalAmount: payments.reduce((sum, p) => sum + (p.amount || 0), 0),
      completedAmount: payments.filter((p) => p.status === "completed").reduce((sum, p) => sum + (p.amount || 0), 0),
    };

    return NextResponse.json({
      success: true,
      data: {
        invoices,
        quotations,
        payments,
        stats: { invoices: invoiceStats, quotations: quotationStats, payments: paymentStats },
      },
    });
  } catch (error) {
    console.error("Sales GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
