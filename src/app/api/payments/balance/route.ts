import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import connectToDatabase from "@/lib/mongodb";
import Payment from "@/models/payment";
import Invoice from "@/models/invoice";

export async function GET() {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    await connectToDatabase();

    const payments = await Payment.find({
      $or: [{ customer: user.userId }, { customerEmail: user.email }],
      status: "completed",
    }).lean();

    const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);

    const invoices = await Invoice.find({
      $or: [
        { "client._id": user.userId },
        { "client.email": user.email },
      ],
    }).lean();

    const totalOwed = invoices.reduce((sum: number, inv: Record<string, unknown>) => {
      if (inv.status !== "paid" && inv.status !== "cancelled") {
        return sum + ((inv.amountDue as number) || (inv.total as number) || 0);
      }
      return sum;
    }, 0);

    return NextResponse.json({
      totalPaid,
      totalOwed,
      balance: totalPaid - totalOwed,
      payments: payments.length,
      invoices: invoices.length,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to fetch balance";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
