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
  { tld: "info", registration: 25.50, renewal: 25.50 },
  { tld: "xyz", registration: 16.00, renewal: 16.00 },
  { tld: "online", registration: 33.00, renewal: 33.00 },
  { tld: "site", registration: 33.00, renewal: 33.00 },
  { tld: "tech", registration: 56.50, renewal: 56.50 },
  { tld: "store", registration: 49.00, renewal: 49.00 },
  { tld: "uk", registration: 7.95, renewal: 7.95 },
  { tld: "co.uk", registration: 7.95, renewal: 7.95 },
  { tld: "eu", registration: 7.50, renewal: 7.50 },
  { tld: "us", registration: 9.00, renewal: 9.00 },
  { tld: "ca", registration: 18.50, renewal: 18.50 },
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
