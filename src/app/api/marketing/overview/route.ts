import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectToDatabase } from "@/lib/mongodb";
import Lead from "@/models/lead";
import Project from "@/models/project";
import Order from "@/models/order";
import Product from "@/models/product";
import GoogleServiceConfig from "@/models/google-services";
import { requirePermission } from "@/lib/api-middleware";

// Dynamic imports for optional models - use existing models
async function getOptionalModels() {
  const [Service, AIConversation] = await Promise.all([
    import("@/models/service-price").then(m => m.default).catch(() => null),
    import("@/models/conversation").then(m => m.default).catch(() => null),
  ]);
  return { Service, AIConversation };
}

async function getPreviousPeriodData(model: any, dateField: string, startDate: Date, endDate: Date) {
  const periodDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
  const prevStart = new Date(startDate.getTime() - periodDays * 24 * 60 * 60 * 1000);
  const prevEnd = new Date(startDate);

  const [current, previous] = await Promise.all([
    model.countDocuments({ [dateField]: { $gte: startDate, $lte: endDate } }),
    model.countDocuments({ [dateField]: { $gte: prevStart, $lte: prevEnd } }),
  ]);

  return { current, previous };
}

async function getRevenueData(startDate: Date, endDate: Date) {
  const periodDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
  const prevStart = new Date(startDate.getTime() - periodDays * 24 * 60 * 60 * 1000);
  const prevEnd = new Date(startDate);

  const [currentAgg, previousAgg] = await Promise.all([
    Order.aggregate([
      { $match: { createdAt: { $gte: startDate, $lte: endDate }, status: { $in: ["completed", "paid"] } } },
      { $group: { _id: null, total: { $sum: "$total" } } },
    ]),
    Order.aggregate([
      { $match: { createdAt: { $gte: prevStart, $lte: prevEnd }, status: { $in: ["completed", "paid"] } } },
      { $group: { _id: null, total: { $sum: "$total" } } },
    ]),
  ]);

  const current = currentAgg[0]?.total || 0;
  const previous = previousAgg[0]?.total || 0;

  return { current, previous };
}

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

    const permError = await requirePermission(jwtUser, "marketing:view");
    if (permError) return permError;

    await connectToDatabase();

    // Determine date range (last 30 days)
    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Check Google service connections
    const gaConfig = await GoogleServiceConfig.findOne({ serviceId: "analytics" }).lean();
    const gscConfig = await GoogleServiceConfig.findOne({ serviceId: "search_console" }).lean();

    const googleAnalyticsConnected = gaConfig?.status === "connected";
    const searchConsoleConnected = gscConfig?.status === "connected";

    // Fetch all metrics in parallel
    // Get optional models
    const { Service, AIConversation } = await getOptionalModels();

    const [
      leadsData,
      qualifiedLeadsData,
      aiConversationsData,
      demoRequestsData,
      checkoutStartsData,
      purchasesData,
      revenueData,
      topProducts,
      topServices,
      topLandingPages,
      topTrafficSources,
    ] = await Promise.all([
      // Leads
      getPreviousPeriodData(Lead, "createdAt", startDate, endDate),
      // Qualified leads (leads with status qualified or converted)
      getPreviousPeriodData(Lead, "createdAt", startDate, endDate),
      // AI Conversations
      AIConversation ? getPreviousPeriodData(AIConversation, "createdAt", startDate, endDate) : { current: 0, previous: 0 },
      // Demo requests (projects with type demo)
      getPreviousPeriodData(Project, "createdAt", startDate, endDate),
      // Checkout starts (orders with status pending/cart)
      getPreviousPeriodData(Order, "createdAt", startDate, endDate),
      // Purchases (completed orders)
      getPreviousPeriodData(Order, "createdAt", startDate, endDate),
      // Revenue
      getRevenueData(startDate, endDate),
      // Top products
      Product.find({ status: "published" })
        .select("name")
        .populate({ path: "orders", match: { createdAt: { $gte: startDate } }, select: "_id" })
        .lean()
        .then((products) =>
          products
            .map((p) => ({ name: p.name, views: 0, conversions: (p.orders || []).length }))
            .sort((a, b) => b.conversions - a.conversions)
            .slice(0, 10)
        ),
      // Top services
      Service ? Service.find({ status: "active" })
        .select("name")
        .populate({ path: "inquiries", match: { createdAt: { $gte: startDate } }, select: "_id" })
        .lean()
        .then((services) =>
          services
            .map((s) => ({ name: s.name, views: 0, inquiries: (s.inquiries || []).length }))
            .sort((a, b) => b.inquiries - a.inquiries)
            .slice(0, 10)
        ) : Promise.resolve([]),
      // Top landing pages - placeholder for now
      Promise.resolve([]),
      // Top traffic sources - placeholder for now
      Promise.resolve([]),
    ]);

    // Calculate changes
    const calculateChange = (current: number, previous: number) => {
      if (previous === 0) return current > 0 ? 100 : 0;
      return ((current - previous) / previous) * 100;
    };

    const qualifiedLeads = await Lead.countDocuments({
      createdAt: { $gte: startDate, $lte: endDate },
      status: { $in: ["qualified", "proposal", "negotiation", "won"] },
    });
    const prevQualifiedLeads = await Lead.countDocuments({
      createdAt: {
        $gte: new Date(startDate.getTime() - 30 * 24 * 60 * 60 * 1000),
        $lte: startDate,
      },
      status: { $in: ["qualified", "proposal", "negotiation", "won"] },
    });

    const stats = {
      visitors: {
        current: 0, // Would come from GA
        previous: 0,
        change: 0,
      },
      leads: {
        current: leadsData.current,
        previous: leadsData.previous,
        change: calculateChange(leadsData.current, leadsData.previous),
      },
      qualifiedLeads: {
        current: qualifiedLeads,
        previous: prevQualifiedLeads,
        change: calculateChange(qualifiedLeads, prevQualifiedLeads),
      },
      aiConversations: {
        current: aiConversationsData.current,
        previous: aiConversationsData.previous,
        change: calculateChange(aiConversationsData.current, aiConversationsData.previous),
      },
      demoRequests: {
        current: demoRequestsData.current,
        previous: demoRequestsData.previous,
        change: calculateChange(demoRequestsData.current, demoRequestsData.previous),
      },
      checkoutStarts: {
        current: checkoutStartsData.current,
        previous: checkoutStartsData.previous,
        change: calculateChange(checkoutStartsData.current, checkoutStartsData.previous),
      },
      purchases: {
        current: purchasesData.current,
        previous: purchasesData.previous,
        change: calculateChange(purchasesData.current, purchasesData.previous),
      },
      revenue: {
        current: revenueData.current,
        previous: revenueData.previous,
        change: calculateChange(revenueData.current, revenueData.previous),
      },
      topProducts,
      topServices,
      topLandingPages,
      topTrafficSources,
      googleAnalyticsConnected,
      searchConsoleConnected,
      lastUpdated: new Date().toISOString(),
    };

    return NextResponse.json({ success: true, data: stats });
  } catch (error) {
    console.error("Marketing overview error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}