import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { PERMISSIONS, hasPermission } from "@/lib/permissions";
import connectToDatabase from "@/lib/mongodb";
import PaymentGateway from "@/models/payment-gateway";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!hasPermission(user.permissions || [], PERMISSIONS.SETTINGS_EDIT)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await connectToDatabase();
    const { id } = await params;
    const gateway = await PaymentGateway.findById(id);
    if (!gateway) return NextResponse.json({ error: "Gateway not found" }, { status: 404 });

    if (!gateway.config.merchantCode || !gateway.config.buyLinkSecret) {
      return NextResponse.json({ error: "Gateway not configured - missing credentials" }, { status: 400 });
    }

    gateway.status = "testing";
    gateway.lastTestedAt = new Date();
    await gateway.save();

    try {
      const { createCheckoutSession } = await import("@/lib/payment-gateway");
      const result = await createCheckoutSession({
        amount: 1.00,
        currency: gateway.config.currency || "USD",
        customerEmail: user.email || "test@wall-v.com",
        customerName: "Gateway Test",
        description: "Gateway Configuration Test - $1.00",
        items: [{ description: "Gateway Test", amount: 1.00, type: "other" }],
        metadata: { test: true, testedBy: user.userId },
      });

      if (result.success) {
        gateway.status = "test-passed";
        gateway.lastTestResult = { success: true, message: "Test checkout session created successfully", timestamp: new Date() };
      } else {
        gateway.status = "test-failed";
        gateway.lastTestResult = { success: false, message: result.error || "Test failed", timestamp: new Date() };
      }
    } catch (testError: unknown) {
      gateway.status = "test-failed";
      const msg = testError instanceof Error ? testError.message : "Test failed";
      gateway.lastTestResult = { success: false, message: msg, timestamp: new Date() };
    }

    await gateway.save();

    return NextResponse.json({
      status: gateway.status,
      result: gateway.lastTestResult,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Test failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
