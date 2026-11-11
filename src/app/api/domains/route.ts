import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import Domain from "@/models/domain";

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const provider = searchParams.get("provider");

    const query: Record<string, unknown> = { user: user.userId };

    if (status) {
      query.status = status;
    }

    if (provider) {
      query.provider = provider;
    }

    const domains = await Domain.find(query).sort({ createdAt: -1 });

    return NextResponse.json({
      success: true,
      domains,
      total: domains.length,
    });
  } catch (error) {
    console.error("Get domains error:", error);
    return NextResponse.json(
      { error: "Failed to get domains" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { domain, provider, registrarAccountId, registrationDate, expiryDate } = body;

    if (!domain || !provider) {
      return NextResponse.json(
        { error: "Domain and provider are required" },
        { status: 400 }
      );
    }

    const existingDomain = await Domain.findOne({ domain });
    if (existingDomain) {
      return NextResponse.json(
        { error: "Domain already exists" },
        { status: 409 }
      );
    }

    const domainRecord = await Domain.create({
      user: user.userId,
      domain,
      status: "active",
      provider,
      registrarAccountId,
      registrationDate: registrationDate || new Date(),
      expiryDate: expiryDate || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
    });

    return NextResponse.json({
      success: true,
      domain: domainRecord,
    });
  } catch (error) {
    console.error("Create domain error:", error);
    return NextResponse.json(
      { error: "Failed to create domain" },
      { status: 500 }
    );
  }
}
