import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectToDatabase } from "@/lib/mongodb";
import GoogleServiceConfig from "@/models/google-services";
import TrackingEvent from "@/models/tracking-event";
import Order from "@/models/order";
import Lead from "@/models/lead";
import { requirePermission } from "@/lib/api-middleware";

export async function GET() {
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

    await connectToDatabase();

    // Check platform connections
    const [gaConfig, adsConfig] = await Promise.all([
      GoogleServiceConfig.findOne({ serviceId: "analytics" }).lean(),
      GoogleServiceConfig.findOne({ serviceId: "ads" }).lean(),
    ]);

    const ga4Connected = gaConfig?.status === "connected";
    const adsConnected = adsConfig?.status === "connected";
    const metaPixelConnected = false; // Would check Meta Pixel config

    // Get events count
    const eventsTracked = await TrackingEvent.countDocuments({ isActive: true });

    // Get today's event firings (placeholder - would query analytics)
    const eventsFiredToday = 0;

    // Get conversions from orders/leads
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const [ordersToday, leadsToday] = await Promise.all([
      Order.countDocuments({ createdAt: { $gte: todayStart }, status: { $in: ["completed", "paid"] } }),
      Lead.countDocuments({ createdAt: { $gte: todayStart }, status: { $in: ["qualified", "proposal", "negotiation", "won"] } }),
    ]);

    const conversionsTracked = ordersToday + leadsToday;
    const totalVisitors = 1000; // Placeholder - would come from GA
    const conversionRate = totalVisitors > 0 ? (conversionsTracked / totalVisitors) * 100 : 0;

    // Revenue tracked
    const revenueAgg = await Order.aggregate([
      { $match: { createdAt: { $gte: todayStart }, status: { $in: ["completed", "paid"] } } },
      { $group: { _id: null, total: { $sum: "$total" } } },
    ]);
    const revenueTracked = revenueAgg[0]?.total || 0;

    // Top events (placeholder)
    const topEvents = [
      { eventName: "page_view", count: 0, category: "page_view" },
      { eventName: "cta_click", count: 0, category: "click" },
      { eventName: "generate_lead", count: leadsToday, category: "conversion" },
      { eventName: "begin_checkout", count: 0, category: "ecommerce" },
      { eventName: "add_to_cart", count: 0, category: "ecommerce" },
      { eventName: "purchase", count: ordersToday, category: "ecommerce" },
      { eventName: "demo_requested", count: 0, category: "conversion" },
      { eventName: "sign_up", count: 0, category: "conversion" },
    ];

    // Top conversions
    const topConversions = [
      { eventName: "purchase", count: ordersToday, value: revenueTracked },
      { eventName: "generate_lead", count: leadsToday, value: leadsToday * 500 }, // Estimated lead value
      { eventName: "demo_requested", count: 0, value: 0 },
      { eventName: "sign_up", count: 0, value: 0 },
    ];

    return NextResponse.json({
      success: true,
      data: {
        eventsTracked,
        eventsFiredToday,
        conversionsTracked,
        conversionRate,
        revenueTracked,
        topEvents,
        topConversions,
        ga4Connected,
        adsConnected,
        metaPixelConnected,
        lastUpdated: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("Tracking overview error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}