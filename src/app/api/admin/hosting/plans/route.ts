import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user || !["super-admin", "admin"].includes(user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const plans = [
      // ResellersPanel plans
      {
        _id: "rp-starter",
        name: "Starter",
        provider: "resellerspanel",
        price: 5.99,
        renewalPrice: 9.99,
        currency: "USD",
        features: ["10GB SSD Storage", "1 Website", "Unlimited Bandwidth", "Free SSL", "Free Backup"],
        description: "10GB SSD, 1 Website, Unlimited Bandwidth",
        isActive: true,
        margin: 15,
      },
      {
        _id: "rp-business",
        name: "Business",
        provider: "resellerspanel",
        price: 12.99,
        renewalPrice: 19.99,
        currency: "USD",
        features: ["50GB SSD Storage", "10 Websites", "Unlimited Bandwidth", "Free SSL", "Free Backup", "Email Accounts"],
        description: "50GB SSD, 10 Websites, Unlimited Bandwidth",
        isActive: true,
        margin: 15,
      },
      {
        _id: "rp-enterprise",
        name: "Enterprise",
        provider: "resellerspanel",
        price: 24.99,
        renewalPrice: 39.99,
        currency: "USD",
        features: ["100GB NVMe Storage", "Unlimited Websites", "Unlimited Bandwidth", "Free SSL", "Free Backup", "Email Accounts", "SSH Access"],
        description: "100GB NVMe, Unlimited Websites, Unlimited Bandwidth",
        isActive: true,
        margin: 15,
      },
      // WebSouls plans
      {
        _id: "ws-startup",
        name: "Startup",
        provider: "websouls",
        price: 35.68,
        renewalPrice: 59.46,
        currency: "PKR",
        features: ["50GB SSD Storage", "5 Websites", "Unlimited Bandwidth", "5 Databases", "Free SSL", "Free Backup"],
        description: "50GB SSD, 5 Websites, Unlimited Bandwidth",
        isActive: true,
        margin: 15,
      },
      {
        _id: "ws-grow",
        name: "Grow",
        provider: "websouls",
        price: 41.53,
        renewalPrice: 71.61,
        currency: "PKR",
        features: ["100GB NVMe Storage", "100 Websites", "Unlimited Bandwidth", "Unlimited Databases", "Free SSL", "Free Backup"],
        description: "100GB NVMe, 100 Websites, Unlimited Bandwidth",
        isActive: true,
        margin: 15,
      },
      {
        _id: "ws-digital",
        name: "Digital",
        provider: "websouls",
        price: 46.16,
        renewalPrice: 83.93,
        currency: "PKR",
        features: ["150GB NVMe Storage", "150 Websites", "AI Website Builder", "Unlimited Bandwidth", "Free SSL", "Free Backup", "SSH Access"],
        description: "150GB NVMe, 150 Websites, AI Website Builder",
        isActive: true,
        margin: 15,
      },
      {
        _id: "ws-business",
        name: "Business",
        provider: "websouls",
        price: 76.11,
        renewalPrice: 158.57,
        currency: "PKR",
        features: ["250GB NVMe Storage", "200 Websites", "AI Website Builder", "Unlimited Bandwidth", "Free SSL", "Free Backup", "SSH Access"],
        description: "250GB NVMe, 200 Websites, AI Website Builder",
        isActive: true,
        margin: 15,
      },
    ];

    const plansWithFinalPrice = plans.map((plan) => ({
      ...plan,
      finalPrice: Math.round(plan.price * (1 + plan.margin / 100) * 100) / 100,
    }));

    return NextResponse.json({
      success: true,
      plans: plansWithFinalPrice,
      total: plansWithFinalPrice.length,
    });
  } catch (error) {
    console.error("Get hosting plans error:", error);
    return NextResponse.json(
      { error: "Failed to get hosting plans" },
      { status: 500 }
    );
  }
}
