import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { PERMISSIONS, hasPermission } from "@/lib/permissions";
import connectToDatabase from "@/lib/mongodb";
import Refund from "@/models/refund";
import Payment from "@/models/payment";
import PaymentAuditLog from "@/models/payment-audit-log";

function generateRefundNumber(): string {
  const ts = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `REF-${ts}-${rand}`;
}

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    await connectToDatabase();
    const url = new URL(request.url);
    const status = url.searchParams.get("status");
    const page = parseInt(url.searchParams.get("page") || "1");
    const limit = parseInt(url.searchParams.get("limit") || "50");

    const query: Record<string, unknown> = {};
    if (status) query.status = status;

    const [refunds, total] = await Promise.all([
      Refund.find(query)
        .populate("payment", "paymentNumber amount currency")
        .populate("customer", "name email")
        .populate("approvedBy", "name email")
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Refund.countDocuments(query),
    ]);

    return NextResponse.json({ refunds, total, page, totalPages: Math.ceil(total / limit) });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to fetch refunds";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!hasPermission(user.permissions || [], PERMISSIONS.FINANCE_EDIT)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await connectToDatabase();
    const body = await request.json();
    const { paymentId, amount, reason, description } = body;

    if (!paymentId || !amount || !reason) {
      return NextResponse.json({ error: "paymentId, amount, and reason are required" }, { status: 400 });
    }

    const payment = await Payment.findById(paymentId);
    if (!payment) return NextResponse.json({ error: "Payment not found" }, { status: 404 });
    if (payment.status !== "completed") {
      return NextResponse.json({ error: "Can only refund completed payments" }, { status: 400 });
    }
    if (amount > payment.amount) {
      return NextResponse.json({ error: "Refund amount exceeds payment amount" }, { status: 400 });
    }

    const existingRefund = await Refund.findOne({ payment: paymentId, status: { $in: ["pending", "approved", "processing", "completed"] } });
    if (existingRefund) {
      const totalRefunded = existingRefund.amount;
      if (totalRefunded + amount > payment.amount) {
        return NextResponse.json({ error: "Total refund amount would exceed payment" }, { status: 400 });
      }
    }

    const refund = await Refund.create({
      refundNumber: generateRefundNumber(),
      payment: paymentId,
      customer: payment.customer,
      customerEmail: payment.customerEmail,
      amount,
      currency: payment.currency,
      reason,
      description,
      status: "pending",
      requestedBy: user.userId,
      invoice: payment.invoice,
      order: payment.order,
      project: payment.project,
    });

    await PaymentAuditLog.create({
      action: "refund_requested",
      entity: "Refund",
      entityId: refund._id,
      user: user.userId,
      customer: payment.customer,
      payment: paymentId,
      invoice: payment.invoice,
      order: payment.order,
      project: payment.project,
      gateway: payment.gateway,
      amount,
      currency: payment.currency,
      previousState: payment.status,
      newState: "refund-requested",
      details: { refundNumber: refund.refundNumber, reason },
    });

    return NextResponse.json({ refund }, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to create refund";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
