import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import Domain from "@/models/domain";
import { renewDomain as rpRenew } from "@/lib/resellerspanel";
import { renewDomain as wsRenew } from "@/lib/websouls";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const { id } = await params;
    const body = await request.json();
    const { years } = body;

    if (!years || years < 1) {
      return NextResponse.json(
        { error: "Years parameter is required and must be at least 1" },
        { status: 400 }
      );
    }

    const domain = await Domain.findOne({
      _id: id,
      user: user.userId,
    });

    if (!domain) {
      return NextResponse.json(
        { error: "Domain not found" },
        { status: 404 }
      );
    }

    let renewalResult;
    if (domain.provider === "resellerspanel") {
      renewalResult = await rpRenew({
        domain: domain.domain,
        years,
      });
    } else if (domain.provider === "websouls") {
      renewalResult = await wsRenew(domain.domain, years);
    } else {
      return NextResponse.json(
        { error: "Invalid provider" },
        { status: 400 }
      );
    }

    if (!renewalResult.success) {
      return NextResponse.json(
        { error: renewalResult.error },
        { status: 500 }
      );
    }

    const newExpiryDate = new Date(domain.expiryDate);
    newExpiryDate.setFullYear(newExpiryDate.getFullYear() + years);

    domain.expiryDate = newExpiryDate;
    await domain.save();

    return NextResponse.json({
      success: true,
      domain,
      orderId: renewalResult.orderId,
    });
  } catch (error) {
    console.error("Domain renewal error:", error);
    return NextResponse.json(
      { error: "Failed to renew domain" },
      { status: 500 }
    );
  }
}
