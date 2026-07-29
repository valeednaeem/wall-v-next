import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import Order from "@/models/order";
import Product from "@/models/product";

function generateOrderNumber(): string {
  const date = new Date();
  const prefix = "WV";
  const datePart = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, "0")}${String(date.getDate()).padStart(2, "0")}`;
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `${prefix}-${datePart}-${random}`;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const status = searchParams.get("status");
    const paymentStatus = searchParams.get("paymentStatus");
    const search = searchParams.get("search");
    const userId = searchParams.get("userId");

    await connectToDatabase();

    const filter: Record<string, unknown> = {};
    if (status) filter.status = status;
    if (paymentStatus) filter.paymentStatus = paymentStatus;
    if (userId) filter.user = userId;
    if (search) {
      filter.$or = [
        { orderNumber: { $regex: search, $options: "i" } },
        { guestEmail: { $regex: search, $options: "i" } },
        { "items.name": { $regex: search, $options: "i" } },
      ];
    }

    const total = await Order.countDocuments(filter);
    const orders = await Order.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    return NextResponse.json({
      success: true,
      data: orders,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      items,
      guestEmail,
      billingAddress,
      shippingAddress,
      paymentMethod,
      notes,
    } = body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: "No items provided" }, { status: 400 });
    }

    await connectToDatabase();

    // Validate products and calculate totals
    let subtotal = 0;
    const orderItems = [];

    for (const item of items) {
      const product = await Product.findOne({ slug: item.slug, status: "published" }).lean();
      if (!product) {
        return NextResponse.json({ error: `Product not found: ${item.slug}` }, { status: 400 });
      }
      if (product.stock !== undefined && product.stock < item.quantity) {
        return NextResponse.json({ error: `Insufficient stock for ${product.name}` }, { status: 400 });
      }

      const price = product.salePrice || product.price;
      subtotal += price * item.quantity;

      orderItems.push({
        product: product._id,
        name: product.name,
        slug: product.slug,
        price,
        quantity: item.quantity,
        image: product.images?.[0] || product.thumbnail,
        variant: item.variant,
      });

      // Decrement stock
      if (product.stock !== undefined) {
        await Product.updateOne({ _id: product._id }, { $inc: { stock: -item.quantity } });
      }
    }

    const tax = Math.round(subtotal * 0.08 * 100) / 100;
    const total = Math.round((subtotal + tax) * 100) / 100;
    const orderNumber = generateOrderNumber();

    const order = await Order.create({
      orderNumber,
      guestEmail: guestEmail || billingAddress?.email,
      items: orderItems,
      subtotal,
      tax,
      taxRate: 0.08,
      total,
      status: paymentMethod === "manual" ? "confirmed" : "pending",
      paymentStatus: paymentMethod === "manual" ? "paid" : "unpaid",
      paymentMethod: paymentMethod || "stripe",
      billingAddress,
      shippingAddress,
      notes,
    });

    return NextResponse.json({
      success: true,
      data: {
        orderId: order._id,
        orderNumber: order.orderNumber,
        total: order.total,
      },
    }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
