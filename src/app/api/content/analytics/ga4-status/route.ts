import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";

export async function GET() {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const configured = !!(
      process.env.GA4_PROPERTY_ID && process.env.GA4_API_SECRET
    );

    return NextResponse.json({
      configured,
      measurementId: process.env.GA4_MEASUREMENT_ID || null,
      propertyId: process.env.GA4_PROPERTY_ID || null,
    });
  } catch (error) {
    console.error("[GA4 Status] Error:", error);
    return NextResponse.json(
      { error: "Failed to check GA4 status" },
      { status: 500 }
    );
  }
}
