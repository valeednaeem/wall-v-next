import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import Billing from "@/models/billing";
import SiteSettings from "@/models/site-settings";
import { getAuthUserFromCookie } from "@/lib/auth-cookie";

export async function GET() {
  try {
    const authUser = await getAuthUserFromCookie();
    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectToDatabase();

    // Fetch all billing records
    const allBilling = await Billing.find().sort({ createdAt: -1 }).lean();

    // Calculate stats
    const completed = allBilling.filter((b: { status: string }) => b.status === "paid");
    const pending = allBilling.filter((b: { status: string }) => b.status === "pending");
    const failed = allBilling.filter((b: { status: string }) => b.status === "failed");
    const refunded = allBilling.filter((b: { status: string }) => b.status === "refunded");

    const totalRevenue = completed.reduce((sum: number, b: { amount?: number }) => sum + (b.amount || 0), 0);
    const pendingAmount = pending.reduce((sum: number, b: { amount?: number }) => sum + (b.amount || 0), 0);
    const failedAmount = failed.reduce((sum: number, b: { amount?: number }) => sum + (b.amount || 0), 0);
    const refundedAmount = refunded.reduce((sum: number, b: { amount?: number }) => sum + (b.amount || 0), 0);

    // Calculate monthly revenue (current month)
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthlyBilling = completed.filter((b: { createdAt: string | Date }) => new Date(b.createdAt) >= monthStart);
    const monthlyRevenue = monthlyBilling.reduce((sum: number, b: { amount?: number }) => sum + (b.amount || 0), 0);

    // Previous month for growth calculation
    const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const prevMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
    const prevMonthBilling = completed.filter((b: { createdAt: string | Date }) => {
      const d = new Date(b.createdAt);
      return d >= prevMonthStart && d <= prevMonthEnd;
    });
    const prevMonthRevenue = prevMonthBilling.reduce((sum: number, b: { amount?: number }) => sum + (b.amount || 0), 0);
    const revenueGrowth = prevMonthRevenue > 0 ? ((monthlyRevenue - prevMonthRevenue) / prevMonthRevenue) * 100 : 0;

    // Fetch gateway settings
    const gatewaySettings = await SiteSettings.find({ category: "paymentGateways" }).lean();
    const gateways = gatewaySettings.map((g: { key: string; value: unknown }) => ({
      name: g.key.split(".")[1],
      ...g.value as Record<string, unknown>,
    }));

    // Format transactions
    const transactions = allBilling.slice(0, 50).map((b: Record<string, unknown>) => ({
      id: b._id?.toString(),
      type: b.type === "one-time" || b.type === "subscription" ? "incoming" : "outgoing",
      amount: b.amount,
      currency: b.currency,
      status: b.status,
      description: b.description,
      method: b.paymentMethod || "N/A",
      date: new Date(b.createdAt as string).toISOString().split("T")[0],
      reference: b.paymentReference || `bill-${b._id?.toString().slice(-6)}`,
    }));

    return NextResponse.json({
      success: true,
      data: {
        stats: {
          totalRevenue,
          monthlyRevenue,
          pendingPayments: pendingAmount,
          completedPayments: totalRevenue,
          failedPayments: failedAmount,
          refundedPayments: refundedAmount,
          onHoldPayments: pendingAmount,
          averageOrderValue: completed.length > 0 ? totalRevenue / completed.length : 0,
          revenueGrowth: Math.round(revenueGrowth * 10) / 10,
        },
        transactions,
        gateways,
      },
    });
  } catch (error) {
    console.error("Payments GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
