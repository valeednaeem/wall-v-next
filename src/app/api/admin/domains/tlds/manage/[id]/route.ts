import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import connectToDatabase from "@/lib/mongodb";
import DomainTLD from "@/models/domain-tld";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser();
    if (!user || !["super-admin", "admin"].includes(user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    await connectToDatabase();

    const tld = await DomainTLD.findById(id).lean();
    if (!tld) {
      return NextResponse.json({ error: "TLD not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, tld });
  } catch (error) {
    console.error("Get domain TLD error:", error);
    return NextResponse.json({ error: "Failed to get domain TLD" }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser();
    if (!user || !["super-admin", "admin"].includes(user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    await connectToDatabase();

    const tld = await DomainTLD.findById(id);
    if (!tld) {
      return NextResponse.json({ error: "TLD not found" }, { status: 404 });
    }

    if (body.registrationPrice !== undefined || body.margin !== undefined) {
      const price = body.registrationPrice ?? tld.registrationPrice;
      const margin = body.margin ?? tld.margin;
      body.finalPrice = Math.round(price * (1 + margin / 100) * 100) / 100;
    }

    if (body.renewalPrice !== undefined || body.margin !== undefined) {
      const price = body.renewalPrice ?? tld.renewalPrice;
      const margin = body.margin ?? tld.margin;
      body.finalRenewalPrice = Math.round(price * (1 + margin / 100) * 100) / 100;
    }

    const updated = await DomainTLD.findByIdAndUpdate(id, body, { new: true }).lean();

    return NextResponse.json({ success: true, tld: updated });
  } catch (error) {
    console.error("Update domain TLD error:", error);
    return NextResponse.json({ error: "Failed to update domain TLD" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser();
    if (!user || !["super-admin", "admin"].includes(user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    await connectToDatabase();

    const tld = await DomainTLD.findByIdAndDelete(id);
    if (!tld) {
      return NextResponse.json({ error: "TLD not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: "TLD deleted" });
  } catch (error) {
    console.error("Delete domain TLD error:", error);
    return NextResponse.json({ error: "Failed to delete domain TLD" }, { status: 500 });
  }
}
