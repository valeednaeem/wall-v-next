import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { PERMISSIONS, hasPermission } from "@/lib/permissions";
import connectToDatabase from "@/lib/mongodb";
import PaymentGateway from "@/models/payment-gateway";

export async function GET() {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!hasPermission(user.permissions || [], PERMISSIONS.SETTINGS_VIEW)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await connectToDatabase();
    let gateway = await PaymentGateway.findOne({ slug: "2checkout" });
    if (!gateway) {
      gateway = await PaymentGateway.create({
        name: "2checkout",
        slug: "2checkout",
        displayName: "2Checkout (Verifone)",
        description: "2Checkout payment gateway for global payments",
        enabled: false,
        testMode: true,
        status: "not-configured",
        config: { hashAlgorithm: "SHA256", currency: "USD", checkoutType: "buy-link" },
      });
    }

    const safeConfig = { ...gateway.toObject() };
    if (safeConfig.credentials) {
      const masked: Record<string, string> = {};
      for (const [k, v] of Object.entries(safeConfig.credentials as Record<string, string>)) {
        masked[k] = v && v.length > 4 ? v.substring(0, 4) + "••••" + v.substring(v.length - 4) : "••••";
      }
      safeConfig.credentials = masked;
    }
    if (safeConfig.config?.secretKey) {
      const sk = safeConfig.config.secretKey as string;
      safeConfig.config.secretKey = sk.length > 4 ? sk.substring(0, 4) + "••••" + sk.substring(sk.length - 4) : "••••";
    }
    if (safeConfig.config?.buyLinkSecret) {
      const bl = safeConfig.config.buyLinkSecret as string;
      safeConfig.config.buyLinkSecret = bl.length > 4 ? bl.substring(0, 4) + "••••" + bl.substring(bl.length - 4) : "••••";
    }
    if (safeConfig.config?.ipnSecret) {
      const ipn = safeConfig.config.ipnSecret as string;
      safeConfig.config.ipnSecret = ipn.length > 4 ? ipn.substring(0, 4) + "••••" + ipn.substring(ipn.length - 4) : "••••";
    }

    return NextResponse.json({ gateway: safeConfig });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to fetch gateway";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!hasPermission(user.permissions || [], PERMISSIONS.SETTINGS_EDIT)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await connectToDatabase();
    const body = await request.json();
    const { merchantCode, secretKey, buyLinkSecret, ipnSecret, hashAlgorithm, currency, checkoutType, returnUrl, cancelUrl, testMode } = body;

    let gateway = await PaymentGateway.findOne({ slug: "2checkout" });
    if (!gateway) {
      gateway = await new PaymentGateway({
        name: "2checkout",
        slug: "2checkout",
        displayName: "2Checkout (Verifone)",
        description: "2Checkout payment gateway for global payments",
      });
    }

    gateway.config.merchantCode = merchantCode || gateway.config.merchantCode;
    gateway.config.secretKey = secretKey || gateway.config.secretKey;
    gateway.config.buyLinkSecret = buyLinkSecret || gateway.config.buyLinkSecret;
    gateway.config.ipnSecret = ipnSecret || gateway.config.ipnSecret;
    gateway.config.hashAlgorithm = hashAlgorithm || gateway.config.hashAlgorithm;
    gateway.config.currency = currency || gateway.config.currency;
    gateway.config.checkoutType = checkoutType || gateway.config.checkoutType;
    gateway.config.returnUrl = returnUrl || gateway.config.returnUrl;
    gateway.config.cancelUrl = cancelUrl || gateway.config.cancelUrl;
    gateway.testMode = testMode !== undefined ? testMode : gateway.testMode;

    const hasCredentials = merchantCode && (buyLinkSecret || ipnSecret || secretKey);
    gateway.status = hasCredentials ? "configured" : "not-configured";
    gateway.enabled = hasCredentials;

    if (returnUrl || cancelUrl) {
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://www.wall-v.com";
      gateway.config.webhookUrl = `${baseUrl}/api/webhooks/2checkout`;
    }

    await gateway.save();

    return NextResponse.json({ gateway, message: "Gateway configuration saved" });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to save gateway";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
