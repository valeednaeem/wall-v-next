import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import connectToDatabase from "@/lib/mongodb";
import DomainTLD from "@/models/domain-tld";

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user || !["super-admin", "admin"].includes(user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await connectToDatabase();

    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category");
    const provider = searchParams.get("provider");
    const isActive = searchParams.get("isActive");

    const query: Record<string, unknown> = {};
    if (category) query.category = category;
    if (provider) query.provider = provider;
    if (isActive !== null) query.isActive = isActive === "true";

    const tlds = await DomainTLD.find(query).sort({ sortOrder: 1 }).lean();

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

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user || !["super-admin", "admin"].includes(user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { tld, provider, registrationPrice, renewalPrice, margin, category, description, features, isPromo, promoPrice, promoDuration } = body;

    if (!tld || !provider || registrationPrice === undefined) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    await connectToDatabase();

    const existing = await DomainTLD.findOne({ tld: tld.toLowerCase() });
    if (existing) {
      return NextResponse.json(
        { error: "TLD already exists" },
        { status: 400 }
      );
    }

    const finalMargin = margin || 15;
    const newTLD = await DomainTLD.create({
      tld: tld.toLowerCase(),
      provider,
      registrationPrice,
      renewalPrice: renewalPrice || registrationPrice,
      transferPrice: 0,
      currency: provider === "websouls" ? "PKR" : "USD",
      margin: finalMargin,
      finalPrice: Math.round(registrationPrice * (1 + finalMargin / 100) * 100) / 100,
      finalRenewalPrice: Math.round((renewalPrice || registrationPrice) * (1 + finalMargin / 100) * 100) / 100,
      description: description || "",
      features: features || [],
      isActive: true,
      isPromo: isPromo || false,
      promoPrice,
      promoDuration,
      category: category || "generic",
      sortOrder: 0,
      createdBy: user.userId,
    });

    return NextResponse.json({
      success: true,
      tld: newTLD,
    });
  } catch (error) {
    console.error("Create domain TLD error:", error);
    return NextResponse.json(
      { error: "Failed to create domain TLD" },
      { status: 500 }
    );
  }
}
