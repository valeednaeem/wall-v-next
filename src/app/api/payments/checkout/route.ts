import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import Order from "@/models/order";
import Product from "@/models/product";
import { generateSecureBuyLink, type CheckoutItem } from "@/services/2checkout";

function generateOrderNumber(): string {
  const date = new Date();
  const prefix = "WV";
  const datePart = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, "0")}${String(date.getDate()).padStart(2, "0")}`;
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `${prefix}-${datePart}-${random}`;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      type = "product",
      items,
      guestEmail,
      billingAddress,
      currency = "USD",
      ref,
    } = body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: "No items provided" }, { status: 400 });
    }

    await connectToDatabase();

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://www.wall-v.com";
    const orderNumber = generateOrderNumber();

    if (type === "product") {
      // Product checkout — validate products and create order
      let subtotal = 0;
      const orderItems = [];
      const checkoutItems: CheckoutItem[] = [];

      for (const item of items) {
        const product = await Product.findOne({ slug: item.slug, status: "published" }).lean();
        if (!product) {
          return NextResponse.json({ error: `Product not found: ${item.slug}` }, { status: 400 });
        }

        const price = product.salePrice || product.price;
        subtotal += price * item.quantity;

        orderItems.push({
          product: product._id,
          name: product.name,
          slug: product.slug,
          price,
          quantity: item.quantity,
          image: product.featuredImage || product.images?.[0],
          variant: item.variant,
        });

        // For 2Checkout, we use a dynamic product approach
        // We store our product code in the product's SKU field or use a mapping
        checkoutItems.push({
          productId: (product as any).sku || product.slug,
          quantity: item.quantity,
          price,
          name: product.name,
        });
      }

      const tax = Math.round(subtotal * 0.08 * 100) / 100;
      const total = Math.round((subtotal + tax) * 100) / 100;

      // Create pending order
      const order = await Order.create({
        orderNumber,
        guestEmail: guestEmail || billingAddress?.email,
        items: orderItems,
        subtotal,
        tax,
        taxRate: 0.08,
        total,
        currency,
        status: "pending",
        paymentStatus: "unpaid",
        paymentMethod: "2checkout",
        billingAddress,
        notes: `2Checkout pending — awaiting IPN confirmation`,
      });

      // Generate 2Checkout buy link
      const backRef = `${appUrl}/checkout/success?order=${orderNumber}`;
      const buyUrl = generateSecureBuyLink({
        items: checkoutItems,
        currency,
        ref: orderNumber,
        backRef,
      });

      return NextResponse.json({
        success: true,
        data: {
          orderId: order._id,
          orderNumber: order.orderNumber,
          total: order.total,
          checkoutUrl: buyUrl,
        },
      }, { status: 201 });

    } else if (type === "project") {
      // Project milestone checkout
      const { projectId, milestoneIndex } = body;
      if (!projectId) {
        return NextResponse.json({ error: "Project ID required" }, { status: 400 });
      }

      const Project = (await import("@/models/project")).default;
      const project = await Project.findById(projectId).lean();
      if (!project) {
        return NextResponse.json({ error: "Project not found" }, { status: 404 });
      }

      const milestone = project.milestones?.[milestoneIndex || 0];
      if (!milestone) {
        return NextResponse.json({ error: "Milestone not found" }, { status: 404 });
      }

      const amount = milestone.amount || project.quote?.min || 0;

      const checkoutItems: CheckoutItem[] = [{
        productId: `project-${project.slug || project._id}`,
        quantity: 1,
        price: amount,
        name: `Milestone: ${milestone.name} — ${project.name}`,
      }];

      const order = await Order.create({
        orderNumber,
        guestEmail: guestEmail || project.client?.email || billingAddress?.email,
        items: [{
          product: project._id,
          name: `Milestone: ${milestone.name}`,
          slug: project.slug || String(project._id),
          price: amount,
          quantity: 1,
        }],
        subtotal: amount,
        tax: 0,
        total: amount,
        currency,
        status: "pending",
        paymentStatus: "unpaid",
        paymentMethod: "2checkout",
        billingAddress,
        notes: `Project milestone payment — ${project.name} — ${milestone.name}`,
      });

      const backRef = `${appUrl}/checkout/success?order=${orderNumber}`;
      const buyUrl = generateSecureBuyLink({
        items: checkoutItems,
        currency,
        ref: orderNumber,
        backRef,
      });

      return NextResponse.json({
        success: true,
        data: {
          orderId: order._id,
          orderNumber: order.orderNumber,
          total: amount,
          checkoutUrl: buyUrl,
        },
      }, { status: 201 });

    } else {
      return NextResponse.json({ error: "Invalid checkout type" }, { status: 400 });
    }
  } catch (error) {
    console.error("[2Checkout Checkout] Error:", error);
    return NextResponse.json({ error: "Payment processing failed" }, { status: 500 });
  }
}
