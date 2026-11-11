import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectToDatabase } from "@/lib/mongodb";
import Order from "@/models/order";
import Lead from "@/models/lead";
import { requirePermission } from "@/lib/api-middleware";

export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ success: false, error: "UNAUTHORIZED", message: "Your session has expired. Please sign in again." }, { status: 401 });
    }

    // Convert NextAuth user to JWTPayload for permission check
    const jwtUser = {
      userId: session.user.id,
      email: session.user.email || null,
      role: (session.user as { role?: string }).role || "customer",
      permissions: (session.user as { permissions?: string[] }).permissions || [],
    };

    const permError = await requirePermission(jwtUser, "tracking:view");
    if (permError) return permError;

    const { searchParams } = new URL(request.url);
    const startParam = searchParams.get("start");
    const endParam = searchParams.get("end");

    await connectToDatabase();

    // Parse date range (default last 30 days)
    const endDate = endParam ? new Date(endParam) : new Date();
    const startDate = startParam ? new Date(startParam) : new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Get orders and leads in date range
    const [orders, leads] = await Promise.all([
      Order.find({
        createdAt: { $gte: startDate, $lte: endDate },
        status: { $in: ["completed", "paid"] },
      }).lean(),
      Lead.find({
        createdAt: { $gte: startDate, $lte: endDate },
        status: { $in: ["qualified", "proposal", "negotiation", "won"] },
      }).lean(),
    ]);

    // Mock attribution data (in production, this would come from GA4/Analytics API)
    const topSources = [
      { source: "google", medium: "organic", visitors: 12500, conversions: 125, conversionRate: 1.0, revenue: 45000 },
      { source: "google", medium: "cpc", visitors: 8200, conversions: 246, conversionRate: 3.0, revenue: 89000 },
      { source: "direct", medium: "none", visitors: 6800, conversions: 68, conversionRate: 1.0, revenue: 24500 },
      { source: "facebook", medium: "social", visitors: 4500, conversions: 90, conversionRate: 2.0, revenue: 32000 },
      { source: "linkedin", medium: "social", visitors: 3200, conversions: 64, conversionRate: 2.0, revenue: 28000 },
      { source: "email", medium: "newsletter", visitors: 2100, conversions: 84, conversionRate: 4.0, revenue: 18000 },
      { source: "referral", medium: "referral", visitors: 1800, conversions: 18, conversionRate: 1.0, revenue: 6500 },
      { source: "bing", medium: "organic", visitors: 1500, conversions: 15, conversionRate: 1.0, revenue: 5200 },
    ];

    const topCampaigns = [
      { campaign: "spring_sale_2024", source: "google", visitors: 5200, conversions: 156, cost: 12400, roas: 7.2 },
      { campaign: "brand_awareness", source: "facebook", visitors: 3800, conversions: 76, cost: 8900, roas: 3.6 },
      { campaign: "linkedin_leads", source: "linkedin", visitors: 2100, conversions: 42, cost: 15000, roas: 1.9 },
      { campaign: "email_nurture_q1", source: "email", visitors: 1800, conversions: 72, cost: 1200, roas: 15.0 },
      { campaign: "retargeting_cart", source: "google", visitors: 1200, conversions: 48, cost: 3400, roas: 13.2 },
    ];

    // Funnel steps
    const funnel = [
      { step: "Visitors", count: 12500, dropoff: 0 },
      { step: "Product Views", count: 8750, dropoff: 30 },
      { step: "Add to Cart", count: 2100, dropoff: 76 },
      { step: "Begin Checkout", count: 1250, dropoff: 40 },
      { step: "Purchase", count: 375, dropoff: 70 },
    ];

    const assistedConversions = [
      { channel: "organic search", assisted: 45, lastClick: 80 },
      { channel: "paid search", assisted: 120, lastClick: 126 },
      { channel: "direct", assisted: 30, lastClick: 38 },
      { channel: "social", assisted: 85, lastClick: 69 },
      { channel: "email", assisted: 42, lastClick: 42 },
      { channel: "referral", assisted: 8, lastClick: 10 },
    ];

    const totalVisitors = topSources.reduce((sum, s) => sum + s.visitors, 0);
    const totalConversions = topSources.reduce((sum, s) => sum + s.conversions, 0);
    const totalRevenue = topSources.reduce((sum, s) => sum + s.revenue, 0);

    return NextResponse.json({
      success: true,
      data: {
        topSources,
        topCampaigns,
        funnel,
        assistedConversions,
        dateRange: { start: startDate.toISOString().split("T")[0], end: endDate.toISOString().split("T")[0] },
        totalVisitors,
        totalConversions,
        totalRevenue,
      },
    });
  } catch (error) {
    console.error("Attribution data error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}