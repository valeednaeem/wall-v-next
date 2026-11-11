import { NextRequest, NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongodb";
import DomainTLD from "@/models/domain-tld";

export async function GET(request: NextRequest) {
  try {
    await connectToDatabase();

    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category");

    const query: Record<string, unknown> = { isActive: true };
    if (category) query.category = category;

    const tlds = await DomainTLD.find(query)
      .select("-createdBy -__v")
      .sort({ sortOrder: 1 })
      .lean();

    return NextResponse.json({
      success: true,
      tlds,
      total: tlds.length,
    });
  } catch (error) {
    console.error("Get public domain TLDs error:", error);
    return NextResponse.json(
      { error: "Failed to get domain TLDs" },
      { status: 500 }
    );
  }
}
