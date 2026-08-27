import crypto from "crypto";
import connectToDatabase from "@/lib/mongodb";
import PaymentGateway from "@/models/payment-gateway";
import Payment from "@/models/payment";
import PaymentAuditLog from "@/models/payment-audit-log";
import Invoice from "@/models/invoice";
import Order from "@/models/order";

const GATEWAY_SLUG = "2checkout";

export interface CheckoutSessionInput {
  amount: number;
  currency: string;
  customerEmail: string;
  customerName: string;
  description: string;
  items: { description: string; amount: number; type: string; referenceId?: string }[];
  invoiceId?: string;
  orderId?: string;
  projectId?: string;
  quotationId?: string;
  billingAddress?: Record<string, string>;
  metadata?: Record<string, unknown>;
}

export interface CheckoutSessionResult {
  success: boolean;
  checkoutUrl?: string;
  paymentId?: string;
  paymentNumber?: string;
  error?: string;
}

export interface WebhookVerificationResult {
  verified: boolean;
  orderRef?: string;
  status?: string;
  amount?: number;
  currency?: string;
  rawPayload?: Record<string, unknown>;
}

async function getGatewayConfig() {
  await connectToDatabase();
  let gateway = await PaymentGateway.findOne({ slug: GATEWAY_SLUG });
  if (!gateway) {
    gateway = await PaymentGateway.create({
      name: "2checkout",
      slug: GATEWAY_SLUG,
      displayName: "2Checkout (Verifone)",
      description: "2Checkout payment gateway for global payments",
      enabled: false,
      testMode: true,
      status: "not-configured",
      config: { hashAlgorithm: "SHA256", currency: "USD", checkoutType: "buy-link" },
    });
  }
  return gateway;
}

function generatePaymentNumber(): string {
  const ts = Date.now().toString(36).toUpperCase();
  const rand = crypto.randomBytes(4).toString("hex").toUpperCase();
  return `PAY-${ts}-${rand}`;
}

function generateIdempotencyKey(data: string): string {
  return crypto.createHash("sha256").update(data).digest("hex");
}

function generateHmacHash(secret: string, params: Record<string, string>): string {
  const sortedKeys = Object.keys(params).sort();
  let data = "";
  for (const key of sortedKeys) {
    if (params[key] !== undefined && params[key] !== null && params[key] !== "") {
      data += params[key];
    }
  }
  return crypto.createHmac("sha256", secret).update(data).digest("hex");
}

export async function createCheckoutSession(input: CheckoutSessionInput): Promise<CheckoutSessionResult> {
  try {
    const gateway = await getGatewayConfig();
    if (!gateway.enabled) {
      return { success: false, error: "Payment gateway is not enabled" };
    }

    const { config } = gateway;
    if (!config.merchantCode || !config.buyLinkSecret) {
      return { success: false, error: "Payment gateway is not configured" };
    }

    const paymentNumber = generatePaymentNumber();
    const idempotencyKey = generateIdempotencyKey(`${input.customerEmail}-${input.amount}-${input.currency}-${Date.now()}`);

    const payment = await Payment.create({
      paymentNumber,
      internalId: idempotencyKey,
      gatewayId: gateway._id,
      gateway: "2checkout",
      customerEmail: input.customerEmail,
      customerName: input.customerName,
      invoice: input.invoiceId || undefined,
      order: input.orderId || undefined,
      project: input.projectId || undefined,
      quotation: input.quotationId || undefined,
      items: input.items,
      amount: input.amount,
      currency: input.currency,
      status: "pending",
      paymentMethod: "2checkout",
      billingAddress: input.billingAddress,
      idempotencyKey,
      metadata: input.metadata,
    });

    await PaymentAuditLog.create({
      action: "checkout_created",
      entity: "Payment",
      entityId: payment._id,
      payment: payment._id,
      invoice: input.invoiceId || undefined,
      order: input.orderId || undefined,
      project: input.projectId || undefined,
      gateway: "2checkout",
      amount: input.amount,
      currency: input.currency,
      details: { paymentNumber, description: input.description },
    });

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://www.wall-v.com";
    const returnUrl = config.returnUrl || `${baseUrl}/checkout/success`;
    const cancelUrl = config.cancelUrl || `${baseUrl}/checkout`;

    const buyLinkParams: Record<string, string> = {
      merchant: config.merchantCode,
      cardholderAmount: input.amount.toFixed(2),
      cardholderCurrency: input.currency,
      orderNumber: paymentNumber,
      productName: input.description,
      return_url: returnUrl,
      cancel_url: cancelUrl,
    };

    const hash = generateHmacHash(config.buyLinkSecret, buyLinkParams);
    buyLinkParams.HASH = hash;

    const buyLink = `https://secure.2checkout.com/checkout/buy.php?${new URLSearchParams(buyLinkParams).toString()}`;

    await Payment.findByIdAndUpdate(payment._id, {
      status: "processing",
      processedAt: new Date(),
      gatewayResponse: { buyLink, checkoutType: "buy-link" },
    });

    if (input.invoiceId) {
      await Invoice.findByIdAndUpdate(input.invoiceId, { status: "awaiting-payment" });
    }
    if (input.orderId) {
      await Order.findByIdAndUpdate(input.orderId, { paymentStatus: "processing" });
    }

    return {
      success: true,
      checkoutUrl: buyLink,
      paymentId: payment._id.toString(),
      paymentNumber,
    };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Checkout creation failed";
    return { success: false, error: message };
  }
}

export async function verifyWebhookNotification(
  headers: Record<string, string>,
  body: Record<string, unknown>
): Promise<WebhookVerificationResult> {
  try {
    const gateway = await getGatewayConfig();
    const { config } = gateway;

    const receivedHash = String(headers["x-2checkout-hash"] || body["HASH"] || "");

    if (!receivedHash) {
      return { verified: false };
    }

    const ipnSecret = config.ipnSecret || config.buyLinkSecret;
    if (!ipnSecret) {
      return { verified: false };
    }

    const ORDER_DICT: Record<string, string> = {
      IPN_TYPE: "IPN_TYPE",
      REFNOEXT: "REFNOEXT",
      ORDERNO: "ORDERNO",
      ORDERSTATUS: "ORDERSTATUS",
      PAYMENTTYPE: "PAYMENTTYPE",
      IPN_PID_DATE: "IPN_PID_DATE",
      IPN_PNAME: "IPN_PNAME",
      IPN_PCODE: "IPN_PCODE",
      IPN_PINFO: "IPN_PINFO",
      IPN_QTY: "IPN_QTY",
      IPN_PRICE: "IPN_PRICE",
      IPN_CURRENCY: "IPN_CURRENCY",
      IPN_DATE: "IPN_DATE",
      HASH: "HASH",
    };

    let hashString = "";
    for (const [, valKey] of Object.entries(ORDER_DICT)) {
      const val = body[valKey] as string;
      if (val !== undefined && val !== null) {
        hashString += val;
      }
    }

    const expectedHash = crypto.createHmac("sha256", ipnSecret).update(hashString).digest("hex");
    const verified = receivedHash === expectedHash;

    if (!verified) {
      await PaymentAuditLog.create({
        action: "webhook_verification_failed",
        entity: "PaymentGateway",
        entityId: gateway._id,
        gateway: "2checkout",
        details: { receivedHash: receivedHash.substring(0, 16) + "..." },
      });
      return { verified: false };
    }

    return {
      verified: true,
      orderRef: body.REFNOEXT as string || body.ORDERNO as string,
      status: body.ORDERSTATUS as string,
      amount: body.CUSTOMERPRICE ? parseFloat(body.CUSTOMERPRICE as string) : undefined,
      currency: body.IPNCURRENCY as string || body.IPNCURRENCY as string,
      rawPayload: body,
    };
  } catch {
    return { verified: false };
  }
}

export async function processWebhookPayment(result: WebhookVerificationResult): Promise<{
  success: boolean;
  paymentId?: string;
  error?: string;
}> {
  try {
    if (!result.verified || !result.orderRef) {
      return { success: false, error: "Invalid webhook" };
    }

    const existingPayment = await Payment.findOne({
      $or: [
        { paymentNumber: result.orderRef },
        { gatewayOrderId: result.orderRef },
        { gatewayTransactionId: result.orderRef },
      ],
    });

    if (!existingPayment) {
      return { success: false, error: "Payment not found" };
    }

    if (existingPayment.status === "completed") {
      return { success: true, paymentId: existingPayment._id.toString() };
    }

    const statusMap: Record<string, string> = {
      "COMPLETE": "completed",
      "PENDING": "processing",
      "REFUND": "refunded",
      "REVERSED": "chargeback",
      "FAILED": "failed",
      "CANCELLED": "cancelled",
    };

    const newStatus = statusMap[result.status || ""] || "processing";
    const previousStatus = existingPayment.status;

    const updateData: Record<string, unknown> = {
      status: newStatus,
      gatewayResponse: result.rawPayload,
      gatewayOrderId: result.orderRef,
    };

    if (newStatus === "completed") {
      updateData.completedAt = new Date();
      if (result.amount) updateData.netAmount = result.amount - (existingPayment.fee || 0);
    } else if (newStatus === "failed") {
      updateData.failedAt = new Date();
    } else if (newStatus === "refunded") {
      updateData.refundedAt = new Date();
      updateData.refund = {
        amount: result.amount || existingPayment.amount,
        status: "completed",
        refundedAt: new Date(),
      };
    }

    const payment = await Payment.findByIdAndUpdate(existingPayment._id, updateData, { new: true });
    if (!payment) return { success: false, error: "Payment update failed" };

    await PaymentAuditLog.create({
      action: `payment_${newStatus}`,
      entity: "Payment",
      entityId: payment._id,
      payment: payment._id,
      invoice: payment.invoice,
      order: payment.order,
      project: payment.project,
      gateway: "2checkout",
      gatewayTransactionId: result.orderRef,
      previousState: previousStatus,
      newState: newStatus,
      amount: payment.amount,
      currency: payment.currency,
      details: result.rawPayload,
    });

    if (newStatus === "completed") {
      if (payment.invoice) {
        const invoice = await Invoice.findById(payment.invoice);
        if (invoice) {
          const newAmountPaid = (invoice.amountPaid || 0) + payment.amount;
          const invoiceStatus = newAmountPaid >= invoice.total ? "paid" : "partially-paid";
          await Invoice.findByIdAndUpdate(payment.invoice, {
            amountPaid: newAmountPaid,
            amountDue: Math.max(0, invoice.total - newAmountPaid),
            status: invoiceStatus,
            paymentMethod: "2checkout",
            paymentReference: result.orderRef,
            paidAt: invoiceStatus === "paid" ? new Date() : undefined,
          });
        }
      }

      if (payment.order) {
        await Order.findByIdAndUpdate(payment.order, {
          paymentStatus: "paid",
          status: "confirmed",
          paymentReference: result.orderRef,
        });
      }

      const gateway = await PaymentGateway.findOne({ slug: GATEWAY_SLUG });
      if (gateway) {
        gateway.stats.totalTransactions += 1;
        gateway.stats.successfulPayments += 1;
        gateway.stats.totalRevenue += payment.amount;
        gateway.stats.lastPaymentAt = new Date();
        await gateway.save();
      }
    } else if (newStatus === "failed") {
      const gateway = await PaymentGateway.findOne({ slug: GATEWAY_SLUG });
      if (gateway) {
        gateway.stats.totalTransactions += 1;
        gateway.stats.failedPayments += 1;
        await gateway.save();
      }
    }

    return { success: true, paymentId: payment._id.toString() };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Webhook processing failed";
    return { success: false, error: message };
  }
}

export async function getPaymentStatus(paymentId: string) {
  await connectToDatabase();
  return Payment.findById(paymentId).populate("invoice").populate("order").populate("project").lean();
}

export async function getCustomerBalance(customerId: string) {
  await connectToDatabase();
  const payments = await Payment.find({ customer: customerId, status: "completed" }).lean();
  const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);

  const invoices = await Invoice.find({}).lean();
  const customerInvoices = invoices.filter((inv: Record<string, unknown>) => {
    const client = inv.client as Record<string, unknown> | undefined;
    return client && client.toString() === customerId;
  });
  const totalOwed = customerInvoices.reduce((sum: number, inv: Record<string, unknown>) => sum + ((inv.amountDue as number) || 0), 0);

  return {
    totalPaid,
    totalOwed,
    balance: totalPaid - totalOwed,
    payments: payments.length,
    invoices: customerInvoices.length,
  };
}

export async function getProjectBalance(projectId: string) {
  await connectToDatabase();
  const payments = await Payment.find({ project: projectId, status: "completed" }).lean();
  const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);

  const invoices = await Invoice.find({ project: projectId }).lean();
  const totalInvoiced = invoices.reduce((sum: number, inv: Record<string, unknown>) => sum + ((inv.total as number) || 0), 0);
  const totalDue = invoices.reduce((sum: number, inv: Record<string, unknown>) => sum + ((inv.amountDue as number) || 0), 0);

  return {
    totalPaid,
    totalInvoiced,
    totalDue,
    balance: totalPaid - totalInvoiced,
    payments: payments.length,
    invoices: invoices.length,
  };
}
