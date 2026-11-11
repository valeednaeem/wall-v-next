import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import connectToDatabase from "@/lib/mongodb";
import Order from "@/models/order";

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    await connectToDatabase();

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const downloadableOnly = searchParams.get("downloadable") === "true";

    const query: Record<string, unknown> = {
      $or: [
        { user: user.userId },
        { guestEmail: user.email?.toLowerCase() },
      ],
      paymentStatus: "paid",
    };

    if (downloadableOnly) {
      query["items"] = { $exists: true, $ne: [] };
    }

    const orders = await Order.find(query)
      .select("orderNumber items subtotal tax total currency status paymentStatus createdAt downloads downloadCount")
      .populate("items.product", "name slug type files")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    const total = await Order.countDocuments(query);

    return NextResponse.json({
      orders,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
