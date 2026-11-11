import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { getAvailableTLDs as rpGetTLDs } from "@/lib/resellerspanel";
import { getPKDomainPricing } from "@/lib/websouls";

const MARGIN_GENERIC = 15;
const MARGIN_CCTLD = 0;
const MARGIN_PK = 15;

function isCCTLD(tld: string): boolean {
  const ccTLDs = ["uk", "co.uk", "eu", "us", "ca", "au", "de", "fr", "jp", "in", "br", "mx", "nl", "se", "ch", "at", "be", "dk", "fi", "ie", "no", "nz", "pl", "pt", "ru", "za", "kr", "cn", "sg", "hk", "tw", "th", "ph", "my", "id", "vn"];
  return ccTLDs.includes(tld);
}

const FALLBACK_RP_TLDS = [
  { tld: "com", registration: 13.50, renewal: 13.50 },
  { tld: "net", registration: 14.00, renewal: 14.00 },
  { tld: "org", registration: 14.50, renewal: 14.50 },
  { tld: "info", registration: 4.49, renewal: 25.50 },
  { tld: "xyz", registration: 16.00, renewal: 16.00 },
  { tld: "online", registration: 9.99, renewal: 33.00 },
  { tld: "site", registration: 6.99, renewal: 33.00 },
  { tld: "tech", registration: 10.99, renewal: 56.50 },
  { tld: "store", registration: 10.99, renewal: 49.00 },
  { tld: "biz", registration: 20.00, renewal: 20.00 },
  { tld: "co", registration: 34.00, renewal: 34.00 },
  { tld: "me", registration: 8.99, renewal: 18.00 },
  { tld: "mobi", registration: 5.99, renewal: 47.00 },
  { tld: "name", registration: 14.00, renewal: 14.00 },
  { tld: "pro", registration: 2.99, renewal: 25.50 },
  { tld: "space", registration: 5.99, renewal: 30.00 },
  { tld: "website", registration: 5.99, renewal: 25.00 },
  { tld: "club", registration: 22.00, renewal: 22.00 },
  { tld: "fun", registration: 6.99, renewal: 36.00 },
  { tld: "ninja", registration: 12.49, renewal: 29.00 },
  { tld: "solutions", registration: 8.99, renewal: 29.00 },
  { tld: "services", registration: 11.49, renewal: 36.00 },
  { tld: "news", registration: 11.49, renewal: 30.00 },
  { tld: "company", registration: 20.00, renewal: 20.00 },
  { tld: "party", registration: 27.00, renewal: 27.00 },
  { tld: "deals", registration: 36.00, renewal: 36.00 },
  { tld: "family", registration: 36.00, renewal: 36.00 },
  { tld: "uk", registration: 7.95, renewal: 7.95 },
  { tld: "co.uk", registration: 7.95, renewal: 7.95 },
  { tld: "eu", registration: 7.50, renewal: 7.50 },
  { tld: "us", registration: 9.00, renewal: 9.00 },
  { tld: "ca", registration: 18.50, renewal: 18.50 },
  { tld: "de", registration: 12.00, renewal: 12.00 },
  { tld: "fr", registration: 12.00, renewal: 12.00 },
  { tld: "in", registration: 12.00, renewal: 12.00 },
  { tld: "nl", registration: 12.00, renewal: 12.00 },
  { tld: "se", registration: 20.00, renewal: 20.00 },
  { tld: "no", registration: 18.00, renewal: 18.00 },
  { tld: "fi", registration: 16.00, renewal: 16.00 },
  { tld: "ch", registration: 14.00, renewal: 14.00 },
  { tld: "at", registration: 14.00, renewal: 14.00 },
  { tld: "be", registration: 10.00, renewal: 10.00 },
  { tld: "dk", registration: 18.00, renewal: 18.00 },
  { tld: "ie", registration: 22.00, renewal: 22.00 },
  { tld: "pt", registration: 18.00, renewal: 18.00 },
  { tld: "pl", registration: 14.00, renewal: 14.00 },
  { tld: "tv", registration: 34.00, renewal: 34.00 },
  { tld: "cc", registration: 12.00, renewal: 12.00 },
  { tld: "ws", registration: 22.00, renewal: 22.00 },
  { tld: "asia", registration: 8.49, renewal: 17.50 },
  { tld: "top", registration: 14.00, renewal: 14.00 },
];

const FALLBACK_WS_TLDS = [
  { tld: "pk", registration: 4299, renewal: 4299 },
  { tld: "com.pk", registration: 4299, renewal: 4299 },
  { tld: "edu.pk", registration: 4299, renewal: 4299 },
];

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user || !["super-admin", "admin"].includes(user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const provider = searchParams.get("provider");

    const tlds: Array<{
      _id: string;
      tld: string;
      provider: string;
      registrationPrice: number;
      renewalPrice: number;
      currency: string;
      margin: number;
      finalPrice: number;
      isActive: boolean;
    }> = [];

    if (!provider || provider === "resellerspanel") {
      let rpTLDs = await rpGetTLDs();
      if (rpTLDs.length === 0) rpTLDs = FALLBACK_RP_TLDS;

      rpTLDs.forEach((tld, index) => {
        const margin = isCCTLD(tld.tld) ? MARGIN_CCTLD : MARGIN_GENERIC;
        tlds.push({
          _id: `rp-${index}`,
          tld: tld.tld,
          provider: "resellerspanel",
          registrationPrice: tld.registration,
          renewalPrice: tld.renewal,
          currency: "USD",
          margin,
          finalPrice: Math.round(tld.registration * (1 + margin / 100) * 100) / 100,
          isActive: true,
        });
      });
    }

    if (!provider || provider === "websouls") {
      let pkPricing;
      try {
        pkPricing = await getPKDomainPricing();
      } catch {
        pkPricing = {
          pk: { registration: 4299, renewal: 4299 },
          comPk: { registration: 4299, renewal: 4299 },
          eduPk: { registration: 4299, renewal: 4299 },
        };
      }

      const pkTLDs = [
        { tld: "pk", ...pkPricing.pk },
        { tld: "com.pk", ...pkPricing.comPk },
        { tld: "edu.pk", ...pkPricing.eduPk },
      ];
      pkTLDs.forEach((tld, index) => {
        tlds.push({
          _id: `ws-${index}`,
          tld: tld.tld,
          provider: "websouls",
          registrationPrice: tld.registration,
          renewalPrice: tld.renewal,
          currency: "PKR",
          margin: MARGIN_PK,
          finalPrice: Math.round(tld.registration * (1 + MARGIN_PK / 100) * 100) / 100,
          isActive: true,
        });
      });
    }

    return NextResponse.json({
      success: true,
      tlds,
      total: tlds.length,
    });
  } catch (error) {
    console.error("Get domain TLDs error:", error);
    return NextResponse.json(
      { error: "Failed to get domain TLDs" },
      { status: 500 }
    );
  }
}
