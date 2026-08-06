import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import Domain from "@/models/domain";
import {
  updateNameservers as rpUpdateNS,
  getDomainInfo as rpGetInfo,
} from "@/lib/resellerspanel";
import {
  updateNameservers as wsUpdateNS,
  getDomainInfo as wsGetInfo,
} from "@/lib/websouls";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const domain = await Domain.findOne({
      _id: params.id,
      user: user.userId,
    });

    if (!domain) {
      return NextResponse.json(
        { error: "Domain not found" },
        { status: 404 }
      );
    }

    let providerInfo = null;
    if (domain.provider === "resellerspanel") {
      providerInfo = await rpGetInfo(domain.domain);
    } else if (domain.provider === "websouls") {
      providerInfo = await wsGetInfo(domain.domain);
    }

    return NextResponse.json({
      success: true,
      domain,
      providerInfo,
    });
  } catch (error) {
    console.error("Get domain error:", error);
    return NextResponse.json(
      { error: "Failed to get domain" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { nameservers, autoRenew, whoisPrivacy } = body;

    const domain = await Domain.findOne({
      _id: params.id,
      user: user.userId,
    });

    if (!domain) {
      return NextResponse.json(
        { error: "Domain not found" },
        { status: 404 }
      );
    }

    if (nameservers) {
      let updateResult;
      if (domain.provider === "resellerspanel") {
        updateResult = await rpUpdateNS(domain.domain, nameservers);
      } else if (domain.provider === "websouls") {
        updateResult = await wsUpdateNS(domain.domain, nameservers);
      }

      if (updateResult && !updateResult.success) {
        return NextResponse.json(
          { error: updateResult.error },
          { status: 500 }
        );
      }

      domain.nameservers = nameservers;
    }

    if (autoRenew !== undefined) {
      domain.autoRenew = autoRenew;
    }

    if (whoisPrivacy !== undefined) {
      domain.whoisPrivacy = whoisPrivacy;
    }

    await domain.save();

    return NextResponse.json({
      success: true,
      domain,
    });
  } catch (error) {
    console.error("Update domain error:", error);
    return NextResponse.json(
      { error: "Failed to update domain" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const domain = await Domain.findOneAndDelete({
      _id: params.id,
      user: user.userId,
    });

    if (!domain) {
      return NextResponse.json(
        { error: "Domain not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Domain deleted successfully",
    });
  } catch (error) {
    console.error("Delete domain error:", error);
    return NextResponse.json(
      { error: "Failed to delete domain" },
      { status: 500 }
    );
  }
}
