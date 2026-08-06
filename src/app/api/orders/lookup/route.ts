import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import Order from "@/models/order";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { orderNumber, email } = body;

    if (!orderNumber || !email) {
      return NextResponse.json({ error: "Order number and email are required" }, { status: 400 });
    }

    await connectToDatabase();

    const order = await Order.findOne({
      orderNumber: orderNumber.trim(),
      $or: [
        { "billingAddress.email": email.trim().toLowerCase() },
        { guestEmail: email.trim().toLowerCase() },
      ],
    })
      .select("orderNumber items subtotal tax taxRate discount total currency status paymentStatus paymentMethod billingAddress createdAt updatedAt")
      .lean();

    if (!order) {
      return NextResponse.json({ error: "Order not found. Please check your order number and email." }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: order });
  } catch (error) {
    console.error("Order lookup error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
