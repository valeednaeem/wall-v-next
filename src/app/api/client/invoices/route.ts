import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import connectToDatabase from "@/lib/mongodb";
import Invoice from "@/models/invoice";

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    await connectToDatabase();

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");

    const query: Record<string, unknown> = {
      $or: [
        { "billingAddress.email": user.email },
        { "billingAddress.email": user.email?.toLowerCase() },
      ],
    };
    if (status) query.status = status;

    const invoices = await Invoice.find(query)
      .select("invoiceNumber items subtotal tax taxRate discount total amountPaid amountDue currency status type dueDate paidAt paymentMethod notes createdAt project")
      .populate("project", "name")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    const total = await Invoice.countDocuments(query);

    return NextResponse.json({ invoices, total, page, limit });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
