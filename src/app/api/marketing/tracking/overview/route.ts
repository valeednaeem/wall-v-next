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
    const gaConfig = await GoogleServiceConfig.findOne({ serviceId: "analytics" }).lean();

    const ga4Connected = gaConfig?.status === "connected";
    const metaPixelConnected = gaConfig?.metaPixelId ? true : false;

    // Get events count
    const eventsTracked = await TrackingEvent.countDocuments({ isActive: true });

    // Get today's event firings from TrackingEvent collection
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const eventsFiredToday = await TrackingEvent.countDocuments({
      isActive: true,
      updatedAt: { $gte: todayStart },
    });

    // Get conversions from orders/leads
    const [ordersToday, leadsToday, allTimeOrders, allTimeLeads] = await Promise.all([
      Order.countDocuments({ createdAt: { $gte: todayStart }, status: { $in: ["completed", "paid"] } }),
      Lead.countDocuments({ createdAt: { $gte: todayStart }, status: { $in: ["qualified", "proposal", "negotiation", "won"] } }),
      Order.countDocuments({ status: { $in: ["completed", "paid"] } }),
      Lead.countDocuments({ status: { $in: ["qualified", "proposal", "negotiation", "won"] } }),
    ]);

    const conversionsTracked = ordersToday + leadsToday;

    // Get real top events from TrackingEvent collection grouped by category
    const topEventsAgg = await TrackingEvent.aggregate([
      { $match: { isActive: true } },
      { $group: { _id: "$category", count: { $sum: 1 }, events: { $push: "$eventName" } } },
      { $sort: { count: -1 } },
      { $limit: 8 },
    ]);

    const topEvents = topEventsAgg.map((e) => ({
      eventName: e.events[0] || e._id,
      count: e.count,
      category: e._id,
    }));

    // If no events in DB, provide defaults based on real conversions
    if (topEvents.length === 0) {
      topEvents.push(
        { eventName: "purchase", count: allTimeOrders, category: "ecommerce" },
        { eventName: "generate_lead", count: allTimeLeads, category: "conversion" },
      );
    }

    // Top conversions from real data
    const revenueAgg = await Order.aggregate([
      { $match: { status: { $in: ["completed", "paid"] } } },
      { $group: { _id: null, total: { $sum: "$total" } } },
    ]);
    const totalRevenue = revenueAgg[0]?.total || 0;

    const topConversions = [
      { eventName: "purchase", count: allTimeOrders, value: totalRevenue },
      { eventName: "generate_lead", count: allTimeLeads, value: allTimeLeads * 500 },
    ];

    // Conversion rate based on all-time data
    const totalVisitors = allTimeOrders + allTimeLeads || 1;
    const conversionRate = totalVisitors > 0 ? ((allTimeOrders + allTimeLeads) / totalVisitors) * 100 : 0;

    return NextResponse.json({
      success: true,
      data: {
        eventsTracked,
        eventsFiredToday,
        conversionsTracked,
        conversionRate,
        revenueTracked: totalRevenue,
        topEvents,
        topConversions,
        ga4Connected,
        metaPixelConnected,
        lastUpdated: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("Tracking overview error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}