import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import connectToDatabase from "@/lib/mongodb";
import HostingOffer from "@/models/hosting-offer";

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user || !["super-admin", "admin"].includes(user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await connectToDatabase();

    const offers = await HostingOffer.find({ isActive: true })
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json({
      success: true,
      offers,
      total: offers.length,
    });
  } catch (error) {
    console.error("Get hosting offers error:", error);
    return NextResponse.json(
      { error: "Failed to get hosting offers" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user || !["super-admin", "admin"].includes(user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { planId, provider, name, originalPrice, offerPrice, validUntil, description } = body;

    if (!planId || !provider || !offerPrice) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    await connectToDatabase();

    const discount = originalPrice > 0
      ? Math.round(((originalPrice - offerPrice) / originalPrice) * 100)
      : 0;

    const newOffer = await HostingOffer.create({
      planId,
      provider,
      name: name || "",
      originalPrice: originalPrice || 0,
      offerPrice,
      discount,
      currency: provider === "websouls" ? "PKR" : "USD",
      description: description || "",
      isActive: true,
      validUntil: validUntil ? new Date(validUntil) : undefined,
      createdBy: user.userId,
    });

    return NextResponse.json({
      success: true,
      offer: newOffer,
    });
  } catch (error) {
    console.error("Create hosting offer error:", error);
    return NextResponse.json(
      { error: "Failed to create hosting offer" },
      { status: 500 }
    );
  }
}
