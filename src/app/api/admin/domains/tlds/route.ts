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
      const rpTLDs = await rpGetTLDs();
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
      const pkPricing = await getPKDomainPricing();
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
