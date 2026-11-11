import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { PERMISSIONS, hasPermission } from "@/lib/permissions";
import connectToDatabase from "@/lib/mongodb";
import Payment from "@/models/payment";

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    await connectToDatabase();
    const url = new URL(request.url);
    const status = url.searchParams.get("status");
    const gateway = url.searchParams.get("gateway");
    const customerId = url.searchParams.get("customerId");
    const invoiceId = url.searchParams.get("invoiceId");
    const orderId = url.searchParams.get("orderId");
    const projectId = url.searchParams.get("projectId");
    const page = parseInt(url.searchParams.get("page") || "1");
    const limit = parseInt(url.searchParams.get("limit") || "50");
    const dateFrom = url.searchParams.get("dateFrom");
    const dateTo = url.searchParams.get("dateTo");

    const isAdmin = hasPermission(user.permissions || [], PERMISSIONS.FINANCE_VIEW);
    const query: Record<string, unknown> = {};

    if (!isAdmin) {
      query.$or = [
        { customer: user.userId },
        { customerEmail: user.email },
      ];
    }

    if (status) query.status = status;
    if (gateway) query.gateway = gateway;
    if (customerId) query.customer = customerId;
    if (invoiceId) query.invoice = invoiceId;
    if (orderId) query.order = orderId;
    if (projectId) query.project = projectId;
    if (dateFrom || dateTo) {
      query.createdAt = {};
      if (dateFrom) (query.createdAt as Record<string, unknown>).$gte = new Date(dateFrom);
      if (dateTo) (query.createdAt as Record<string, unknown>).$lte = new Date(dateTo);
    }

    const [payments, total, stats] = await Promise.all([
      Payment.find(query)
        .populate("customer", "name email")
        .populate("invoice", "invoiceNumber total")
        .populate("order", "orderNumber total")
        .populate("project", "name")
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Payment.countDocuments(query),
      Payment.aggregate([
        { $match: query },
        { $group: {
          _id: "$status",
          count: { $sum: 1 },
          totalAmount: { $sum: "$amount" },
        }},
      ]),
    ]);

    return NextResponse.json({
      payments,
      total,
      page,
      totalPages: Math.ceil(total / limit),
      stats: Object.fromEntries(stats.map((s) => [s._id, { count: s.count, totalAmount: s.totalAmount }])),
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to fetch payments";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
