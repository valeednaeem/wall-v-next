import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import Order from "@/models/order";
import Product from "@/models/product";
import Project from "@/models/project";
import Invoice from "@/models/invoice";
import { createCheckoutSession } from "@/lib/payment-gateway";

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
      invoiceId,
      projectId,
      milestoneIndex,
    } = body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: "No items provided" }, { status: 400 });
    }

    await connectToDatabase();
    const orderNumber = generateOrderNumber();

    if (type === "product") {
      let subtotal = 0;
      const orderItems = [];
      const checkoutItems = [];

      for (const item of items) {
        const product = await Product.findOne({ slug: item.slug, status: "published" }).lean();
        if (!product) {
          return NextResponse.json({ error: `Product not found: ${item.slug}` }, { status: 400 });
        }

        const price = (product as Record<string, unknown>).salePrice || (product as Record<string, unknown>).price;
        subtotal += (price as number) * item.quantity;

        orderItems.push({
          product: (product as Record<string, unknown>)._id,
          name: (product as Record<string, unknown>).name,
          slug: (product as Record<string, unknown>).slug,
          price,
          quantity: item.quantity,
          image: (product as Record<string, unknown>).featuredImage,
          variant: item.variant,
        });

        checkoutItems.push({
          description: (product as Record<string, unknown>).name as string,
          amount: price as number,
          type: "product" as const,
          referenceId: (product as Record<string, unknown>)._id?.toString(),
        });
      }

      const tax = Math.round(subtotal * 0.08 * 100) / 100;
      const total = Math.round((subtotal + tax) * 100) / 100;

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
        notes: `2Checkout pending — awaiting payment confirmation`,
      });

      const customerEmail = guestEmail || billingAddress?.email || "";
      const customerName = billingAddress?.name || "Customer";

      const result = await createCheckoutSession({
        amount: total,
        currency,
        customerEmail,
        customerName,
        description: `Order ${orderNumber} — ${orderItems.length} item(s)`,
        items: checkoutItems,
        orderId: order._id.toString(),
        billingAddress,
        metadata: { orderNumber, type: "product" },
      });

      if (!result.success) {
        return NextResponse.json({ error: result.error }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        data: {
          orderId: order._id,
          orderNumber: order.orderNumber,
          total: order.total,
          checkoutUrl: result.checkoutUrl,
          paymentId: result.paymentId,
        },
      }, { status: 201 });

    } else if (type === "project") {
      if (!projectId) {
        return NextResponse.json({ error: "Project ID required" }, { status: 400 });
      }

      const project = await Project.findById(projectId).lean() as Record<string, unknown> | null;
      if (!project) {
        return NextResponse.json({ error: "Project not found" }, { status: 404 });
      }

      const milestones = project.milestones as { name: string; amount?: number; status: string }[] | undefined;
      const milestone = milestones?.[milestoneIndex || 0];
      if (!milestone) {
        return NextResponse.json({ error: "Milestone not found" }, { status: 404 });
      }

      const amount = milestone.amount || ((project.quote as Record<string, unknown>)?.min as number) || 0;

      const order = await Order.create({
        orderNumber,
        guestEmail: guestEmail || (project.client as Record<string, unknown>)?.email as string || billingAddress?.email,
        items: [{
          product: project._id,
          name: `Milestone: ${milestone.name}`,
          slug: (project.slug as string) || String(project._id),
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

      const customerEmail = guestEmail || (project.client as Record<string, unknown>)?.email as string || billingAddress?.email || "";
      const customerName = billingAddress?.name || (project.client as Record<string, unknown>)?.name as string || "Customer";

      const result = await createCheckoutSession({
        amount,
        currency,
        customerEmail,
        customerName,
        description: `${project.name} — Milestone: ${milestone.name}`,
        items: [{ description: `Milestone: ${milestone.name}`, amount, type: "project-milestone", referenceId: project._id?.toString() }],
        projectId: projectId,
        orderId: order._id.toString(),
        billingAddress,
        metadata: { orderNumber, type: "project", milestoneIndex: milestoneIndex || 0 },
      });

      if (!result.success) {
        return NextResponse.json({ error: result.error }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        data: {
          orderId: order._id,
          orderNumber: order.orderNumber,
          total: amount,
          checkoutUrl: result.checkoutUrl,
          paymentId: result.paymentId,
        },
      }, { status: 201 });

    } else if (type === "invoice") {
      if (!invoiceId) {
        return NextResponse.json({ error: "Invoice ID required" }, { status: 400 });
      }

      const invoice = await Invoice.findById(invoiceId).lean() as Record<string, unknown> | null;
      if (!invoice) {
        return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
      }

      const amount = (invoice.amountDue as number) || (invoice.total as number);
      const client = invoice.client as Record<string, string> | undefined;
      const customerEmail = client?.email || guestEmail || billingAddress?.email || "";
      const customerName = client?.name || billingAddress?.name || "Customer";

      const result = await createCheckoutSession({
        amount,
        currency: (invoice.currency as string) || "USD",
        customerEmail,
        customerName,
        description: `Invoice ${invoice.invoiceNumber}`,
        items: [{
          description: `Invoice ${invoice.invoiceNumber}`,
          amount,
          type: "other",
          referenceId: invoiceId,
        }],
        invoiceId,
        projectId: invoice.project?.toString(),
        billingAddress,
        metadata: { orderNumber, type: "invoice", invoiceNumber: invoice.invoiceNumber },
      });

      if (!result.success) {
        return NextResponse.json({ error: result.error }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        data: {
          invoiceId: invoice._id,
          invoiceNumber: invoice.invoiceNumber,
          total: amount,
          checkoutUrl: result.checkoutUrl,
          paymentId: result.paymentId,
        },
      }, { status: 201 });

    } else if (type === "deposit") {
      if (!projectId) {
        return NextResponse.json({ error: "Project ID required" }, { status: 400 });
      }

      const project = await Project.findById(projectId).lean() as Record<string, unknown> | null;
      if (!project) {
        return NextResponse.json({ error: "Project not found" }, { status: 404 });
      }

      const financial = project.financial as Record<string, unknown> | undefined;
      const depositAmount = (financial?.depositAmount as number) || ((project.totalAmount as number) || 0) * 0.25;

      const order = await Order.create({
        orderNumber,
        guestEmail: (project.client as Record<string, unknown>)?.email as string || billingAddress?.email,
        items: [{
          product: project._id,
          name: `Deposit: ${project.name}`,
          slug: (project.slug as string) || String(project._id),
          price: depositAmount,
          quantity: 1,
        }],
        subtotal: depositAmount,
        tax: 0,
        total: depositAmount,
        currency,
        status: "pending",
        paymentStatus: "unpaid",
        paymentMethod: "2checkout",
        billingAddress,
        notes: `Project deposit — ${project.name}`,
      });

      const customerEmail = (project.client as Record<string, unknown>)?.email as string || billingAddress?.email || "";
      const customerName = (project.client as Record<string, unknown>)?.name as string || billingAddress?.name || "Customer";

      const result = await createCheckoutSession({
        amount: depositAmount,
        currency,
        customerEmail,
        customerName,
        description: `Deposit for ${project.name}`,
        items: [{ description: `Deposit: ${project.name}`, amount: depositAmount, type: "project-deposit", referenceId: projectId }],
        projectId,
        orderId: order._id.toString(),
        billingAddress,
        metadata: { orderNumber, type: "deposit" },
      });

      if (!result.success) {
        return NextResponse.json({ error: result.error }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        data: {
          orderId: order._id,
          orderNumber,
          total: depositAmount,
          checkoutUrl: result.checkoutUrl,
          paymentId: result.paymentId,
        },
      }, { status: 201 });

    } else {
      return NextResponse.json({ error: "Invalid checkout type" }, { status: 400 });
    }
  } catch (error) {
    console.error("[Checkout] Error:", error);
    return NextResponse.json({ error: "Payment processing failed" }, { status: 500 });
  }
}
