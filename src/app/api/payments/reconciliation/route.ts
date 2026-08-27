import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { PERMISSIONS, hasPermission } from "@/lib/permissions";
import connectToDatabase from "@/lib/mongodb";
import Payment from "@/models/payment";
import Order from "@/models/order";
import Invoice from "@/models/invoice";

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!hasPermission(user.permissions || [], PERMISSIONS.FINANCE_VIEW)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await connectToDatabase();
    const url = new URL(request.url);
    const period = url.searchParams.get("period") || "30d";
    const days = period === "90d" ? 90 : period === "7d" ? 7 : 30;
    const since = new Date(Date.now() - days * 86400000);

    const [payments, orders, invoices] = await Promise.all([
      Payment.find({ createdAt: { $gte: since } }).lean(),
      Order.find({ createdAt: { $gte: since } }).lean(),
      Invoice.find({ createdAt: { $gte: since } }).lean(),
    ]);

    const paidPayments = payments.filter((p) => p.status === "completed");
    const totalPaymentAmount = paidPayments.reduce((sum, p) => sum + p.amount, 0);

    const paidOrders = orders.filter((o) => o.paymentStatus === "paid");
    const totalOrderAmount = paidOrders.reduce((sum, o) => sum + o.total, 0);

    const paidInvoices = invoices.filter((i) => i.status === "paid");
    const totalInvoiceAmount = paidInvoices.reduce((sum, i) => sum + (i.total as number), 0);

    const paymentOrderMatch = paidPayments.filter((p) => p.order).length;
    const paymentInvoiceMatch = paidPayments.filter((p) => p.invoice).length;

    const unmatchedPayments = paidPayments.filter((p) => !p.order && !p.invoice);
    const unmatchedOrders = paidOrders.filter((o) => !payments.find((p) => p.order?.toString() === o._id?.toString() && p.status === "completed"));

    const amountMismatch = Math.abs(totalPaymentAmount - totalOrderAmount);

    return NextResponse.json({
      period,
      summary: {
        totalPayments: totalPaymentAmount,
        totalOrders: totalOrderAmount,
        totalInvoices: totalInvoiceAmount,
        paymentCount: paidPayments.length,
        orderCount: paidOrders.length,
        invoiceCount: paidInvoices.length,
        amountMismatch,
      },
      matching: {
        paymentsWithOrders: paymentOrderMatch,
        paymentsWithInvoices: paymentInvoiceMatch,
        unmatchedPayments: unmatchedPayments.length,
        unmatchedOrders: unmatchedOrders.length,
      },
      mismatches: [
        ...unmatchedPayments.map((p) => ({
          type: "missing_order",
          paymentId: p.paymentNumber,
          amount: p.amount,
          gateway: p.gateway,
          gatewayOrderId: p.gatewayOrderId,
          date: p.createdAt,
        })),
        ...unmatchedOrders.map((o) => ({
          type: "missing_payment",
          orderNumber: o.orderNumber,
          amount: o.total,
          paymentStatus: o.paymentStatus,
          date: o.createdAt,
        })),
      ],
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Reconciliation failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
