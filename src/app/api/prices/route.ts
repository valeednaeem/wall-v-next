import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import ServicePrice from "@/models/service-price";

export async function GET() {
  try {
    await connectToDatabase();
    const prices = await ServicePrice.find({ active: true })
      .sort({ displayOrder: 1, category: 1 })
      .lean();

    const formatted = prices.map((p) => ({
      key: p.serviceKey,
      name: p.name,
      category: p.category,
      description: p.description,
      type: p.type,
      basePrice: p.basePrice,
      currency: p.currency,
      hourlyRate: p.hourlyRate,
      tiers: p.tiers,
      features: p.features,
      technology: p.technology,
      estimatedHours: p.estimatedHours,
      estimatedWeeks: p.estimatedWeeks,
      agentDescription: p.agentDescription,
    }));

    return NextResponse.json({ prices: formatted });
  } catch (error) {
    console.error("Error fetching public prices:", error);
    return NextResponse.json({ error: "Failed to fetch prices" }, { status: 500 });
  }
}
