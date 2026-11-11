import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import connectToDatabase from "@/lib/mongodb";
import HostingPlan from "@/models/hosting-plan";

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

    const plans = await HostingPlan.find(query).sort({ sortOrder: 1 }).lean();

    return NextResponse.json({
      success: true,
      plans,
      total: plans.length,
    });
  } catch (error) {
    console.error("Get hosting plans error:", error);
    return NextResponse.json(
      { error: "Failed to get hosting plans" },
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
    const {
      name, slug, provider, providerPlanId, price, renewalPrice, currency,
      billingCycle, margin, description, shortDescription, features, highlights,
      diskSpace, bandwidth, websites, emailAccounts, databases,
      ssl, backup, migration, sshAccess, dedicatedIp, websiteBuilder,
      oneClickInstaller, controlPanel, category, isPopular,
    } = body;

    if (!name || !provider || !price || !diskSpace || !bandwidth) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    await connectToDatabase();

    const planSlug = slug || name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
    const existing = await HostingPlan.findOne({ slug: planSlug });
    if (existing) {
      return NextResponse.json(
        { error: "Plan with this name already exists" },
        { status: 400 }
      );
    }

    const finalMargin = margin || 15;
    const newPlan = await HostingPlan.create({
      name,
      slug: planSlug,
      provider,
      providerPlanId: providerPlanId || planSlug,
      price,
      renewalPrice: renewalPrice || price,
      currency: currency || "USD",
      billingCycle: billingCycle || "monthly",
      margin: finalMargin,
      finalPrice: Math.round(price * (1 + finalMargin / 100) * 100) / 100,
      finalRenewalPrice: Math.round((renewalPrice || price) * (1 + finalMargin / 100) * 100) / 100,
      description,
      shortDescription: shortDescription || "",
      features: features || [],
      highlights: highlights || [],
      diskSpace,
      bandwidth,
      websites: websites || 1,
      emailAccounts,
      databases,
      ssl: ssl !== false,
      backup: backup !== false,
      migration: migration !== false,
      sshAccess: sshAccess || false,
      dedicatedIp: dedicatedIp || false,
      websiteBuilder: websiteBuilder || false,
      oneClickInstaller: oneClickInstaller !== false,
      controlPanel: controlPanel || "cPanel",
      isActive: true,
      isPopular: isPopular || false,
      sortOrder: 0,
      category: category || "shared",
      createdBy: user.userId,
    });

    return NextResponse.json({
      success: true,
      plan: newPlan,
    });
  } catch (error) {
    console.error("Create hosting plan error:", error);
    return NextResponse.json(
      { error: "Failed to create hosting plan" },
      { status: 500 }
    );
  }
}
