import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import Project from "@/models/project";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { projectId, amount, currency, method, billingDetails } = body;

    if (!projectId || !amount || !method) {
      return NextResponse.json(
        { error: "Project ID, amount, and payment method are required" },
        { status: 400 }
      );
    }

    await connectToDatabase();

    const project = await Project.findById(projectId);
    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    // Create payment record in project notes
    const paymentRecord = {
      method,
      amount,
      currency: currency || "USD",
      billingDetails,
      timestamp: new Date().toISOString(),
      status: "processing",
    };

    project.notes = JSON.stringify(paymentRecord);
    project.status = "pending-payment";
    await project.save();

    let redirectUrl = "";

    switch (method) {
      case "stripe": {
        // Stripe integration - redirect to Stripe Checkout
        // In production, use the Stripe SDK:
        // const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
        // const session = await stripe.checkout.sessions.create({...});
        // redirectUrl = session.url;

        // For demo, redirect to success page
        redirectUrl = `/checkout/${projectId}/success?method=stripe&amount=${amount}`;
        break;
      }
      case "paypal": {
        // PayPal integration - redirect to PayPal
        // In production, use PayPal SDK:
        // const paypal = await createPayPalOrder(amount, currency);
        // redirectUrl = paypal.approvalUrl;

        redirectUrl = `/checkout/${projectId}/success?method=paypal&amount=${amount}`;
        break;
      }
      case "2checkout": {
        // 2Checkout integration
        // In production, use 2Checkout API:
        // const order = await create2CheckoutOrder(amount, currency);
        // redirectUrl = order.checkoutUrl;

        redirectUrl = `/checkout/${projectId}/success?method=2checkout&amount=${amount}`;
        break;
      }
      default:
        return NextResponse.json({ error: "Unsupported payment method" }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      data: {
        redirectUrl,
        paymentId: `pay-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        method,
        amount,
        currency: currency || "USD",
      },
    });
  } catch (error) {
    console.error("Payment creation error:", error);
    return NextResponse.json({ error: "Payment processing failed" }, { status: 500 });
  }
}
