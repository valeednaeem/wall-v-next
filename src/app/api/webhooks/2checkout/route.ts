import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import Order from "@/models/order";
import Project from "@/models/project";
import Invoice from "@/models/invoice";
import Payment from "@/models/payment";
import PaymentGateway from "@/models/payment-gateway";
import PaymentAuditLog from "@/models/payment-audit-log";
import { verifyIpnHash, generateIpnResponse, generateIpnErrorResponse } from "@/services/2checkout";
import { checkRateLimit, getClientIp, logSecurityEvent } from "@/lib/security";

export async function POST(request: Request) {
  try {
    const ip = getClientIp(request);

    // Rate limit webhooks: 30 per minute per IP
    const rl = checkRateLimit("webhook:2checkout:" + ip, 30, 60 * 1000);
    if (!rl.allowed) {
      await logSecurityEvent({
        type: "webhook_rate_limit",
        severity: "medium",
        ip,
        path: "/api/webhooks/2checkout",
        method: "POST",
        blocked: true,
      });
      return new NextResponse(generateIpnErrorResponse(), {
        status: 429,
        headers: { "Content-Type": "text/xml" },
      });
    }

    const text = await request.text();
    const params = new URLSearchParams(text);

    const ipnParams: Record<string, string> = {};
    for (const [key, value] of params.entries()) {
      ipnParams[key] = value;
    }

    console.log("[2Checkout IPN] Received:", JSON.stringify({
      refno: ipnParams.REFNO,
      orderno: ipnParams.ORDERNO,
      status: ipnParams.ORDERSTATUS,
      refnoext: ipnParams.REFNOEXT,
    }));

    // Require HMAC verification — never skip
    const receivedHash = ipnParams.HASH || ipnParams.HASH_SHA3 || "";
    if (!receivedHash) {
      console.error("[2Checkout IPN] Missing HMAC hash — rejecting webhook");
      await logSecurityEvent({
        type: "webhook_signature_invalid",
        severity: "high",
        ip,
        path: "/api/webhooks/2checkout",
        method: "POST",
        details: { reason: "Missing HASH and HASH_SHA3" },
        blocked: true,
      });
      return new NextResponse(generateIpnErrorResponse(), {
        status: 400,
        headers: { "Content-Type": "text/xml" },
      });
    }

    const isValid = verifyIpnHash(ipnParams, receivedHash);
    if (!isValid) {
      console.error("[2Checkout IPN] Invalid HMAC signature");
      await logSecurityEvent({
        type: "webhook_signature_invalid",
        severity: "high",
        ip,
        path: "/api/webhooks/2checkout",
        method: "POST",
        details: { refno: ipnParams.REFNO },
        blocked: true,
      });
      return new NextResponse(generateIpnErrorResponse(), {
        status: 400,
        headers: { "Content-Type": "text/xml" },
      });
    }

    await connectToDatabase();

    const orderStatus = ipnParams.ORDERSTATUS;
    const orderRefNo = ipnParams.REFNO;
    const refNoExt = ipnParams.REFNOEXT || "";
    const currency = ipnParams.CURRENCY || "USD";
    const totalGeneral = parseFloat(ipnParams.IPN_TOTALGENERAL || "0");
    const customerEmail = ipnParams.CUSTOMEREMAIL || "";
    const customerFirstName = ipnParams.FIRSTNAME || "";
    const customerLastName = ipnParams.LASTNAME || "";
    const lookupRef = refNoExt || orderRefNo;

    // IDEMPOTENCY: Check if this IPN was already processed
    const existingPayment = await Payment.findOne({
      $or: [
        { gatewayOrderId: orderRefNo },
        { gatewayTransactionId: orderRefNo },
        { paymentNumber: refNoExt },
      ],
    });

    if (existingPayment && existingPayment.status === "completed" && orderStatus === "COMPLETE") {
      console.log("[2Checkout IPN] Already processed, returning success:", existingPayment.paymentNumber);
      const ipnPid0 = ipnParams["IPN_PID[0]"] || "";
      const ipnPname0 = ipnParams["IPN_PNAME[0]"] || "";
      const ipnDate = ipnParams.IPN_DATE || "";
      return new NextResponse(generateIpnResponse(ipnPid0, ipnPname0, ipnDate), {
        status: 200,
        headers: { "Content-Type": "text/xml" },
      });
    }

    // Process through the unified payment gateway
    const { processWebhookPayment, verifyWebhookNotification } = await import("@/lib/payment-gateway");
    const verificationResult = await verifyWebhookNotification(
      Object.fromEntries(new URLSearchParams(text).entries()) as Record<string, string>,
      ipnParams as unknown as Record<string, unknown>
    );

    // Use IPN params directly for processing if HMAC verification returned unverified
    const webhookResult = verificationResult.verified
      ? verificationResult
      : { verified: true, orderRef: lookupRef, status: orderStatus, amount: totalGeneral, currency, rawPayload: ipnParams as unknown as Record<string, unknown> };

    const processResult = await processWebhookPayment(webhookResult);

    if (!processResult.success) {
      // Fallback: try processing as an Order (legacy path)
      console.log("[2Checkout IPN] Unified payment not found, trying legacy order path");

      const order = await Order.findOne({
        $or: [
          { orderNumber: refNoExt },
          { orderNumber: orderRefNo },
          { paymentReference: orderRefNo },
        ],
      });

      if (order) {
        // Check if already processed
        if (order.paymentStatus === "paid" && orderStatus === "COMPLETE") {
          const ipnPid0 = ipnParams["IPN_PID[0]"] || "";
          const ipnPname0 = ipnParams["IPN_PNAME[0]"] || "";
          const ipnDate = ipnParams.IPN_DATE || "";
          return new NextResponse(generateIpnResponse(ipnPid0, ipnPname0, ipnDate), {
            status: 200,
            headers: { "Content-Type": "text/xml" },
          });
        }

        switch (orderStatus) {
          case "COMPLETE":
          case "PENDING":
            order.status = "confirmed";
            order.paymentStatus = "paid";
            order.paymentReference = orderRefNo;
            order.billingAddress = {
              ...order.billingAddress,
              name: `${customerFirstName} ${customerLastName}`.trim(),
              email: customerEmail,
            };
            break;
          case "REFUND":
            order.status = "refunded";
            order.paymentStatus = "refunded";
            order.paymentReference = orderRefNo;
            break;
          case "REVERSED":
            order.status = "cancelled";
            order.paymentStatus = "failed";
            order.paymentReference = orderRefNo;
            break;
        }

        await order.save();

        // Create Payment record for this order
        const paymentNumber = `PAY-${orderRefNo}`;
        await Payment.create({
          paymentNumber,
          internalId: `ipn-${orderRefNo}`,
          gateway: "2checkout",
          gatewayOrderId: orderRefNo,
          gatewayTransactionId: orderRefNo,
          customerEmail,
          customerName: `${customerFirstName} ${customerLastName}`.trim(),
          order: order._id,
          items: order.items.map((item: { name: string; price: number }) => ({
            description: item.name,
            amount: item.price,
            type: "product" as const,
          })),
          amount: order.total,
          currency,
          status: orderStatus === "COMPLETE" ? "completed" : orderStatus === "REFUND" ? "refunded" : "processing",
          paymentMethod: "2checkout",
          completedAt: orderStatus === "COMPLETE" ? new Date() : undefined,
          gatewayResponse: ipnParams as unknown as Record<string, unknown>,
        });

        // Handle project milestone payments
        if (order.notes?.includes("Project milestone payment") && order.status === "confirmed") {
          const firstItem = order.items[0];
          if (firstItem?.product) {
            const project = await Project.findById(firstItem.product);
            if (project && project.milestones?.length) {
              const milestoneIdx = project.milestones.findIndex(
                (m: { name: string }) => m.name === firstItem.name.replace("Milestone: ", "")
              );
              if (milestoneIdx >= 0) {
                project.milestones[milestoneIdx].status = "completed";
              }

              const completedMilestones = project.milestones.filter(
                (m: { status: string }) => m.status === "completed"
              ).length;
              project.paymentStatus = completedMilestones === project.milestones.length ? "paid" : "partial";
              if (project.status === "pending-payment") {
                project.status = "in-progress";
              }
              await project.save();

              await Invoice.create({
                invoiceNumber: `INV-${order.orderNumber}`,
                client: { name: `${customerFirstName} ${customerLastName}`.trim(), email: customerEmail },
                project: project._id,
                items: [{
                  description: firstItem.name,
                  quantity: 1,
                  unitPrice: firstItem.price,
                  total: firstItem.price,
                }],
                subtotal: firstItem.price,
                total: firstItem.price,
                currency,
                status: "paid",
                paidAt: new Date(),
                paymentMethod: "2checkout",
                paymentReference: orderRefNo,
              });
            }
          }
        }

        // Audit log
        await PaymentAuditLog.create({
          action: `order_payment_${orderStatus.toLowerCase()}`,
          entity: "Order",
          entityId: order._id,
          order: order._id,
          gateway: "2checkout",
          gatewayTransactionId: orderRefNo,
          previousState: "pending",
          newState: orderStatus === "COMPLETE" ? "paid" : orderStatus.toLowerCase(),
          amount: order.total,
          currency,
          details: ipnParams,
        });
      }
    }

    // Update gateway stats
    const gateway = await PaymentGateway.findOne({ slug: "2checkout" });
    if (gateway) {
      gateway.stats.totalTransactions += 1;
      if (orderStatus === "COMPLETE") {
        gateway.stats.successfulPayments += 1;
        gateway.stats.totalRevenue += totalGeneral;
        gateway.stats.lastPaymentAt = new Date();
      } else if (orderStatus === "REFUND" || orderStatus === "REVERSED") {
        gateway.stats.totalRefunds += totalGeneral;
      } else if (orderStatus === "FAILED") {
        gateway.stats.failedPayments += 1;
      }
      await gateway.save();
    }

    const ipnPid0 = ipnParams["IPN_PID[0]"] || "";
    const ipnPname0 = ipnParams["IPN_PNAME[0]"] || "";
    const ipnDate = ipnParams.IPN_DATE || "";
    const responseXml = generateIpnResponse(ipnPid0, ipnPname0, ipnDate);

    console.log("[2Checkout IPN] Processed:", lookupRef, "->", orderStatus);

    return new NextResponse(responseXml, {
      status: 200,
      headers: { "Content-Type": "text/xml" },
    });
  } catch (error) {
    console.error("[2Checkout IPN] Error:", error);
    return new NextResponse(generateIpnErrorResponse(), {
      status: 500,
      headers: { "Content-Type": "text/xml" },
    });
  }
}

export async function GET() {
  return NextResponse.json({ status: "ok", message: "2Checkout IPN endpoint active" });
}
