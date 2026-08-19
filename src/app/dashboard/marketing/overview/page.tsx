"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { Loader2, RefreshCw, TrendingUp, Users, Target, ShoppingBag, DollarSign, BarChart3, Globe, MessageSquare, Zap, AlertCircle, CheckCircle2, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";

interface OverviewStats {
  visitors: { current: number; previous: number; change: number };
  leads: { current: number; previous: number; change: number };
  qualifiedLeads: { current: number; previous: number; change: number };
  aiConversations: { current: number; previous: number; change: number };
  demoRequests: { current: number; previous: number; change: number };
  checkoutStarts: { current: number; previous: number; change: number };
  purchases: { current: number; previous: number; change: number };
  revenue: { current: number; previous: number; change: number };
  topProducts: Array<{ name: string; views: number; conversions: number }>;
  topServices: Array<{ name: string; views: number; inquiries: number }>;
  topLandingPages: Array<{ path: string; views: number; conversions: number }>;
  topTrafficSources: Array<{ source: string; visitors: number; conversions: number }>;
  googleAnalyticsConnected: boolean;
  searchConsoleConnected: boolean;
  lastUpdated: string;
}

export default function MarketingOverviewPage() {
  const { data: session, status } = useSession();
  const [stats, setStats] = useState<OverviewStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (status === "loading") return;
    if (status === "unauthenticated") {
      window.location.href = "/login?callbackUrl=/dashboard/marketing/overview";
      return;
    }
    fetchStats();
  }, [status]);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/marketing/overview");
      const data = await res.json();
      if (data.success) {
        setStats(data.data);
      }
    } catch (error) {
      console.error("Failed to fetch overview:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + "M";
    if (num >= 1000) return (num / 1000).toFixed(1) + "K";
    return num.toString();
  };

  const formatCurrency = (num: number) => {
    return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(num);
  };

  const getChangeColor = (change: number) => {
    if (change > 0) return "text-green-600";
    if (change < 0) return "text-red-600";
    return "text-gray-600";
  };

  const getChangeIcon = (change: number) => {
    if (change > 0) return <TrendingUp className="h-3.5 w-3.5 text-green-600" />;
    if (change < 0) return <TrendingUp className="h-3.5 w-3.5 text-red-600 rotate-180" />;
    return <span className="h-3.5 w-3.5 text-gray-400">−</span>;
  };

  if (status === "loading") {
    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold">Marketing Overview</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="rounded-lg border p-6 animate-pulse">
              <div className="h-4 bg-muted rounded w-1/2 mb-2" />
              <div className="h-8 bg-muted rounded w-1/4" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!session) return null;

  if (!stats) {
    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold">Marketing Overview</h2>
        <div className="rounded-lg border p-8 text-center text-muted-foreground">
          No data available. Connect Google Analytics to see metrics.
        </div>
      </div>
    );
  }

  const metricCards = [
    { label: "Visitors", value: formatNumber(stats.visitors.current), change: stats.visitors.change, icon: Users, color: "text-blue-500", bg: "bg-blue-50", connected: stats.googleAnalyticsConnected },
    { label: "Leads", value: formatNumber(stats.leads.current), change: stats.leads.change, icon: Target, color: "text-green-500", bg: "bg-green-50", connected: stats.googleAnalyticsConnected },
    { label: "Qualified Leads", value: formatNumber(stats.qualifiedLeads.current), change: stats.qualifiedLeads.change, icon: CheckCircle2, color: "text-purple-500", bg: "bg-purple-50", connected: stats.googleAnalyticsConnected },
    { label: "AI Conversations", value: formatNumber(stats.aiConversations.current), change: stats.aiConversations.change, icon: MessageSquare, color: "text-orange-500", bg: "bg-orange-50", connected: true },
    { label: "Demo Requests", value: formatNumber(stats.demoRequests.current), change: stats.demoRequests.change, icon: Zap, color: "text-pink-500", bg: "bg-pink-50", connected: true },
    { label: "Checkout Starts", value: formatNumber(stats.checkoutStarts.current), change: stats.checkoutStarts.change, icon: ShoppingBag, color: "text-amber-500", bg: "bg-amber-50", connected: true },
    { label: "Purchases", value: formatNumber(stats.purchases.current), change: stats.purchases.change, icon: TrendingUp, color: "text-emerald-500", bg: "bg-emerald-50", connected: true },
    { label: "Revenue", value: formatCurrency(stats.revenue.current), change: stats.revenue.change, icon: DollarSign, color: "text-yellow-500", bg: "bg-yellow-50", connected: true },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <BarChart3 className="h-6 w-6 text-primary" />
            Marketing Overview
          </h2>
          <p className="text-sm text-muted-foreground mt-1">Key metrics from Google Analytics, Wall-V CRM, and e-commerce systems</p>
        </div>
        <div className="flex items-center gap-3">
          {!stats.googleAnalyticsConnected && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
              <AlertCircle className="h-3.5 w-3.5" />
              GA Not Connected
            </span>
          )}
          <button onClick={fetchStats} disabled={refreshing} className="inline-flex items-center gap-2 text-sm border rounded-lg px-3 py-2 hover:bg-accent transition-colors disabled:opacity-50">
            {refreshing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            Refresh
          </button>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {metricCards.map((card) => (
          <div key={card.label} className="rounded-lg border p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{card.label}</p>
                <p className="mt-1 text-3xl font-bold">{card.value}</p>
              </div>
              <div className={cn("h-10 w-10 rounded-lg flex items-center justify-center", card.bg)}>
                <card.icon className={cn("h-5 w-5", card.color)} />
              </div>
            </div>
            <div className="mt-4 flex items-center gap-1.5 text-sm">
              <span className={cn("font-medium", getChangeColor(card.change))}>
                {getChangeIcon(card.change)}
                {card.change >= 0 ? "+" : ""}{card.change.toFixed(1)}%
              </span>
              <span className="text-muted-foreground">vs last period</span>
            </div>
            {!card.connected && (
              <p className="mt-2 text-xs text-amber-600">Requires Google Analytics connection</p>
            )}
          </div>
        ))}
      </div>

      {/* Top Products */}
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-lg border p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold flex items-center gap-2">
              <ShoppingBag className="h-5 w-5" />
              Top Products
            </h3>
            <a href="/dashboard/ecommerce/products" className="text-sm text-primary hover:underline">View all</a>
          </div>
          {stats.topProducts.length === 0 ? (
            <p className="text-sm text-muted-foreground">No product data available</p>
          ) : (
            <div className="space-y-3">
              {stats.topProducts.slice(0, 5).map((product, index) => (
                <div key={product.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-muted-foreground w-6">{index + 1}.</span>
                    <div>
                      <p className="font-medium text-sm">{product.name}</p>
                      <p className="text-xs text-muted-foreground">{formatNumber(product.views)} views</p>
                    </div>
                  </div>
                  <span className="text-sm font-medium text-green-600">{product.conversions} conversions</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-lg border p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold flex items-center gap-2">
              <Zap className="h-5 w-5" />
              Top Services
            </h3>
            <a href="/dashboard/services" className="text-sm text-primary hover:underline">View all</a>
          </div>
          {stats.topServices.length === 0 ? (
            <p className="text-sm text-muted-foreground">No service data available</p>
          ) : (
            <div className="space-y-3">
              {stats.topServices.slice(0, 5).map((service, index) => (
                <div key={service.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-muted-foreground w-6">{index + 1}.</span>
                    <div>
                      <p className="font-medium text-sm">{service.name}</p>
                      <p className="text-xs text-muted-foreground">{formatNumber(service.views)} views</p>
                    </div>
                  </div>
                  <span className="text-sm font-medium text-blue-600">{service.inquiries} inquiries</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-lg border p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold flex items-center gap-2">
              <Globe className="h-5 w-5" />
              Top Landing Pages
            </h3>
            <a href="/dashboard/marketing/seo/pages" className="text-sm text-primary hover:underline">View all</a>
          </div>
          {stats.topLandingPages.length === 0 ? (
            <p className="text-sm text-muted-foreground">No landing page data available</p>
          ) : (
            <div className="space-y-3">
              {stats.topLandingPages.slice(0, 5).map((page, index) => (
                <div key={page.path} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-muted-foreground w-6">{index + 1}.</span>
                    <div>
                      <p className="font-medium text-sm font-mono">{page.path}</p>
                      <p className="text-xs text-muted-foreground">{formatNumber(page.views)} views</p>
                    </div>
                  </div>
                  <span className="text-sm font-medium text-green-600">{page.conversions} conversions</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-lg border p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold flex items-center gap-2">
              <Users className="h-5 w-5" />
              Top Traffic Sources
            </h3>
            <a href="/dashboard/marketing/tracking/attribution" className="text-sm text-primary hover:underline">View all</a>
          </div>
          {stats.topTrafficSources.length === 0 ? (
            <p className="text-sm text-muted-foreground">No traffic source data available</p>
          ) : (
            <div className="space-y-3">
              {stats.topTrafficSources.slice(0, 5).map((source, index) => (
                <div key={source.source} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-muted-foreground w-6">{index + 1}.</span>
                    <div>
                      <p className="font-medium text-sm capitalize">{source.source}</p>
                      <p className="text-xs text-muted-foreground">{formatNumber(source.visitors)} visitors</p>
                    </div>
                  </div>
                  <span className="text-sm font-medium text-purple-600">{source.conversions} conversions</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Connection Status */}
      <div className="rounded-lg border p-6 bg-blue-50 border-blue-200">
        <h3 className="font-semibold text-blue-900 mb-4 flex items-center gap-2">
          <ExternalLink className="h-5 w-5" />
          Data Source Status
        </h3>
        <div className="grid md:grid-cols-3 gap-4">
          <div className="space-y-2 p-4 rounded-lg bg-white border">
            <div className="flex items-center gap-2">
              <span className={cn("h-3 w-3 rounded-full", stats.googleAnalyticsConnected ? "bg-green-500" : "bg-gray-300")} />
              <span className="font-medium">Google Analytics</span>
            </div>
            <p className="text-sm text-muted-foreground ml-5">
              {stats.googleAnalyticsConnected ? "Connected — showing real data" : "Not connected — showing Wall-V data only"}
            </p>
          </div>
          <div className="space-y-2 p-4 rounded-lg bg-white border">
            <div className="flex items-center gap-2">
              <span className={cn("h-3 w-3 rounded-full", stats.searchConsoleConnected ? "bg-green-500" : "bg-gray-300")} />
              <span className="font-medium">Search Console</span>
            </div>
            <p className="text-sm text-muted-foreground ml-5">
              {stats.searchConsoleConnected ? "Connected — search data available" : "Not connected — limited search insights"}
            </p>
          </div>
          <div className="space-y-2 p-4 rounded-lg bg-white border">
            <div className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-full bg-green-500" />
              <span className="font-medium">Wall-V Internal</span>
            </div>
            <p className="text-sm text-muted-foreground ml-5">Always available — CRM, orders, AI, products</p>
          </div>
        </div>
        <p className="text-xs text-blue-700 mt-4">
          Last updated: {new Date(stats.lastUpdated).toLocaleString()}
        </p>
      </div>
    </div>
  );
}