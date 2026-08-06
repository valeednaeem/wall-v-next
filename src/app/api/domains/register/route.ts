import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { registerDomain as rpRegister } from "@/lib/resellerspanel";
import { registerDomain as wsRegister } from "@/lib/websouls";
import Domain from "@/models/domain";

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
    const {
      domain,
      years,
      provider,
      registrant,
      nameservers,
      whoisPrivacy,
    } = body;

    if (!domain || !years || !provider || !registrant) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    let registrationResult;

    if (provider === "resellerspanel") {
      registrationResult = await rpRegister({
        domain,
        years,
        registrant: {
          firstName: registrant.firstName,
          lastName: registrant.lastName,
          email: registrant.email,
          organization: registrant.organization,
          address: registrant.address,
          city: registrant.city,
          state: registrant.state,
          zip: registrant.zip,
          country: registrant.country,
          phone: registrant.phone,
        },
        nameservers,
      });
    } else if (provider === "websouls") {
      registrationResult = await wsRegister({
        domain,
        years,
        registrant: {
          firstName: registrant.firstName,
          lastName: registrant.lastName,
          email: registrant.email,
          organization: registrant.organization,
          address: registrant.address,
          city: registrant.city,
          state: registrant.state,
          zip: registrant.zip,
          country: registrant.country,
          phone: registrant.phone,
        },
        nameservers,
      });
    } else {
      return NextResponse.json(
        { error: "Invalid provider" },
        { status: 400 }
      );
    }

    if (!registrationResult.success) {
      return NextResponse.json(
        { error: registrationResult.error },
        { status: 500 }
      );
    }

    const registrationDate = new Date();
    const expiryDate = new Date();
    expiryDate.setFullYear(expiryDate.getFullYear() + years);

    const domainRecord = await Domain.create({
      user: user.userId,
      domain,
      status: "pending",
      provider,
      registrarAccountId: registrationResult.orderId,
      registrationDate,
      expiryDate,
      autoRenew: true,
      nameservers: nameservers || [],
      registrantInfo: {
        name: `${registrant.firstName} ${registrant.lastName}`,
        email: registrant.email,
        organization: registrant.organization,
        address: registrant.address,
        city: registrant.city,
        country: registrant.country,
        phone: registrant.phone,
      },
      whoisPrivacy: whoisPrivacy || false,
    });

    return NextResponse.json({
      success: true,
      domain: domainRecord,
      orderId: registrationResult.orderId,
    });
  } catch (error) {
    console.error("Domain registration error:", error);
    return NextResponse.json(
      { error: "Failed to register domain" },
      { status: 500 }
    );
  }
}
