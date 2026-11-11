import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import Order from "@/models/order";
import { getAuthUser } from "@/lib/auth";
import { pickFields } from "@/lib/pick-fields";

const ORDER_UPDATE_FIELDS = ["status", "paymentStatus", "trackingNumber", "notes", "shippingAddress"];

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser();
    if (!user || !["super-admin", "admin", "manager", "staff"].includes(user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    await connectToDatabase();

    const order = await Order.findOne({
      $or: [{ _id: id }, { orderNumber: id }],
    })
      .lean();

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: order });
  } catch (error) {
    console.error("Order GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser();
    if (!user || !["super-admin", "admin", "manager"].includes(user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const orderData = pickFields(body, ORDER_UPDATE_FIELDS);
    await connectToDatabase();

    const order = await Order.findByIdAndUpdate(id, orderData, { new: true }).lean();
    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: order });
  } catch (error) {
    console.error("Order PATCH error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
