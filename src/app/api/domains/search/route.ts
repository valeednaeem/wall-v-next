import { NextRequest, NextResponse } from "next/server";
import {
  searchDomain,
  searchMultipleDomains,
} from "@/lib/domain-pricing";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const domain = searchParams.get("domain");
    const tlds = searchParams.get("tlds");

    if (!domain) {
      return NextResponse.json(
        { error: "Domain parameter is required" },
        { status: 400 }
      );
    }

    if (tlds) {
      const tldList = tlds.split(",").map((t) => t.trim());
      const results = await searchMultipleDomains(domain, tldList);
      return NextResponse.json({ success: true, results });
    }

    const result = await searchDomain(domain);
    return NextResponse.json({ success: true, result });
  } catch (error) {
    console.error("Domain search error:", error);
    return NextResponse.json(
      { error: "Failed to search domain" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { domain, tlds } = body;

    if (!domain && !tlds) {
      return NextResponse.json(
        { error: "Domain or tlds parameter is required" },
        { status: 400 }
      );
    }

    if (tlds && Array.isArray(tlds)) {
      const results = await searchMultipleDomains(domain || "", tlds);
      return NextResponse.json({ success: true, results });
    }

    const result = await searchDomain(domain);
    return NextResponse.json({ success: true, result });
  } catch (error) {
    console.error("Domain search error:", error);
    return NextResponse.json(
      { error: "Failed to search domain" },
      { status: 500 }
    );
  }
}
