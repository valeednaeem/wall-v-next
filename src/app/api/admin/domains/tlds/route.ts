import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user || !["super-admin", "admin"].includes(user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const provider = searchParams.get("provider");
    const isActive = searchParams.get("isActive");

    const query: Record<string, unknown> = {};
    if (provider) query.provider = provider;
    if (isActive !== null) query.isActive = isActive === "true";

    const tlds = [
      // Generic TLDs via ResellersPanel
      { tld: "com", provider: "resellerspanel", registrationPrice: 13.50, renewalPrice: 13.50, currency: "USD", margin: 15, isActive: true },
      { tld: "net", provider: "resellerspanel", registrationPrice: 14.00, renewalPrice: 14.00, currency: "USD", margin: 15, isActive: true },
      { tld: "org", provider: "resellerspanel", registrationPrice: 14.50, renewalPrice: 14.50, currency: "USD", margin: 15, isActive: true },
      { tld: "info", provider: "resellerspanel", registrationPrice: 25.50, renewalPrice: 25.50, currency: "USD", margin: 15, isActive: true },
      { tld: "xyz", provider: "resellerspanel", registrationPrice: 16.00, renewalPrice: 16.00, currency: "USD", margin: 15, isActive: true },
      { tld: "online", provider: "resellerspanel", registrationPrice: 33.00, renewalPrice: 33.00, currency: "USD", margin: 15, isActive: true },
      { tld: "site", provider: "resellerspanel", registrationPrice: 33.00, renewalPrice: 33.00, currency: "USD", margin: 15, isActive: true },
      { tld: "tech", provider: "resellerspanel", registrationPrice: 56.50, renewalPrice: 56.50, currency: "USD", margin: 15, isActive: true },
      { tld: "store", provider: "resellerspanel", registrationPrice: 49.00, renewalPrice: 49.00, currency: "USD", margin: 15, isActive: true },
      // Country-code TLDs via ResellersPanel (0% margin)
      { tld: "uk", provider: "resellerspanel", registrationPrice: 7.95, renewalPrice: 7.95, currency: "USD", margin: 0, isActive: true },
      { tld: "co.uk", provider: "resellerspanel", registrationPrice: 7.95, renewalPrice: 7.95, currency: "USD", margin: 0, isActive: true },
      { tld: "eu", provider: "resellerspanel", registrationPrice: 7.50, renewalPrice: 7.50, currency: "USD", margin: 0, isActive: true },
      { tld: "us", provider: "resellerspanel", registrationPrice: 9.00, renewalPrice: 9.00, currency: "USD", margin: 0, isActive: true },
      { tld: "ca", provider: "resellerspanel", registrationPrice: 18.50, renewalPrice: 18.50, currency: "USD", margin: 0, isActive: true },
      // PK domains via WebSouls (15% margin)
      { tld: "pk", provider: "websouls", registrationPrice: 4299, renewalPrice: 4299, currency: "PKR", margin: 15, isActive: true },
      { tld: "com.pk", provider: "websouls", registrationPrice: 4299, renewalPrice: 4299, currency: "PKR", margin: 15, isActive: true },
      { tld: "edu.pk", provider: "websouls", registrationPrice: 4299, renewalPrice: 4299, currency: "PKR", margin: 15, isActive: true },
    ];

    const filteredTlds = tlds.map((tld, index) => ({
      _id: `tld-${index}`,
      ...tld,
      finalPrice: Math.round(tld.registrationPrice * (1 + tld.margin / 100) * 100) / 100,
    }));

    return NextResponse.json({
      success: true,
      tlds: filteredTlds,
      total: filteredTlds.length,
    });
  } catch (error) {
    console.error("Get domain TLDs error:", error);
    return NextResponse.json(
      { error: "Failed to get domain TLDs" },
      { status: 500 }
    );
  }
}
