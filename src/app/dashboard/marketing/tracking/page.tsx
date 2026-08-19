"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { Save, Loader2, RefreshCw, Target, Zap, ShoppingBag, DollarSign, BarChart3, ArrowRight, ExternalLink, Settings, Search, Package, Users } from "lucide-react";
import { cn } from "@/lib/utils";

interface TrackingOverview {
  eventsTracked: number;
  eventsFiredToday: number;
  conversionsTracked: number;
  conversionRate: number;
  revenueTracked: number;
  topEvents: Array<{ eventName: string; count: number; category: string }>;
  topConversions: Array<{ eventName: string; count: number; value: number }>;
  ga4Connected: boolean;
  adsConnected: boolean;
  metaPixelConnected: boolean;
  lastUpdated: string;
}

export default function TrackingPage() {
  const { data: session, status } = useSession();
  const [overview, setOverview] = useState<TrackingOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (status === "loading") return;
    if (status === "unauthenticated") {
      window.location.href = "/login?callbackUrl=/dashboard/marketing/tracking";
      return;
    }
    fetchOverview();
  }, [status]);

  const fetchOverview = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/marketing/tracking/overview");
      const data = await res.json();
      if (data.success) {
        setOverview(data.data);
      }
    } catch (error) {
      console.error("Failed to fetch tracking overview:", error);
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

  if (status === "loading") {
    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold">Event Tracking</h2>
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

  if (!overview) {
    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold">Event Tracking</h2>
        <div className="rounded-lg border p-8 text-center text-muted-foreground">
          No tracking data available. Set up events and connect GA4.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Target className="h-6 w-6 text-primary" />
            Event Tracking Overview
          </h2>
          <p className="text-sm text-muted-foreground mt-1">Monitor events, conversions, and e-commerce tracking across GA4, Google Ads, and Meta Pixel</p>
        </div>
        <div className="flex items-center gap-3">
          <a href="/dashboard/marketing/tracking/events" className="inline-flex items-center gap-2 text-sm border rounded-lg px-3 py-2 hover:bg-accent transition-colors">
            <Settings className="h-4 w-4" />
            Manage Events
          </a>
          <button onClick={fetchOverview} disabled={refreshing} className="inline-flex items-center gap-2 text-sm border rounded-lg px-3 py-2 hover:bg-accent transition-colors disabled:opacity-50">
            {refreshing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            Refresh
          </button>
        </div>
      </div>

      {/* Connection Status */}
      <div className="rounded-lg border p-4 bg-blue-50 border-blue-200">
        <div className="flex items-center justify-between">
          <h3 className="font-medium">Platform Connections</h3>
          <div className="flex items-center gap-4">
            <span className={cn("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium",
              overview.ga4Connected ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-700"
            )}>
              {overview.ga4Connected ? <CheckCircle2 className="h-3.5 w-3.5" /> : <XCircle className="h-3.5 w-3.5" />}
              GA4
            </span>
            <span className={cn("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium",
              overview.adsConnected ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-700"
            )}>
              {overview.adsConnected ? <CheckCircle2 className="h-3.5 w-3.5" /> : <XCircle className="h-3.5 w-3.5" />}
              Google Ads
            </span>
            <span className={cn("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium",
              overview.metaPixelConnected ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-700"
            )}>
              {overview.metaPixelConnected ? <CheckCircle2 className="h-3.5 w-3.5" /> : <XCircle className="h-3.5 w-3.5" />}
              Meta Pixel
            </span>
          </div>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Events Defined", value: formatNumber(overview.eventsTracked), icon: Target, color: "text-blue-500", bg: "bg-blue-50" },
          { label: "Events Fired Today", value: formatNumber(overview.eventsFiredToday), icon: Zap, color: "text-orange-500", bg: "bg-orange-50" },
          { label: "Conversions Tracked", value: formatNumber(overview.conversionsTracked), icon: BarChart3, color: "text-green-500", bg: "bg-green-50" },
          { label: "Conversion Rate", value: `${overview.conversionRate.toFixed(2)}%`, icon: ArrowRight, color: "text-purple-500", bg: "bg-purple-50" },
          { label: "Revenue Tracked", value: formatCurrency(overview.revenueTracked), icon: DollarSign, color: "text-yellow-500", bg: "bg-yellow-50" },
          { label: "E-commerce Events", value: formatNumber(overview.topEvents.filter(e => e.category === "ecommerce").length), icon: ShoppingBag, color: "text-amber-500", bg: "bg-amber-50" },
        ].map((card) => (
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
          </div>
        ))}
      </div>

      {/* Top Events & Conversions */}
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-lg border p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold flex items-center gap-2">
              <Zap className="h-5 w-5" />
              Top Events (Today)
            </h3>
            <a href="/dashboard/marketing/tracking/events" className="text-sm text-primary hover:underline">View all</a>
          </div>
          {overview.topEvents.length === 0 ? (
            <p className="text-sm text-muted-foreground">No event data available</p>
          ) : (
            <div className="space-y-3">
              {overview.topEvents.slice(0, 10).map((event, index) => (
                <div key={event.eventName} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-muted-foreground w-6">{index + 1}.</span>
                    <div>
                      <p className="font-medium text-sm font-mono">{event.eventName}</p>
                      <p className="text-xs text-muted-foreground capitalize">{event.category}</p>
                    </div>
                  </div>
                  <span className="text-sm font-medium text-blue-600">{formatNumber(event.count)}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-lg border p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Top Conversions
            </h3>
            <a href="/dashboard/marketing/tracking/conversions" className="text-sm text-primary hover:underline">View all</a>
          </div>
          {overview.topConversions.length === 0 ? (
            <p className="text-sm text-muted-foreground">No conversion data available</p>
          ) : (
            <div className="space-y-3">
              {overview.topConversions.slice(0, 10).map((conv, index) => (
                <div key={conv.eventName} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-muted-foreground w-6">{index + 1}.</span>
                    <div>
                      <p className="font-medium text-sm font-mono">{conv.eventName}</p>
                      <p className="text-xs text-muted-foreground">{formatNumber(conv.count)} conversions</p>
                    </div>
                  </div>
                  <span className="text-sm font-medium text-green-600">{formatCurrency(conv.value)}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-lg border p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold flex items-center gap-2">
              <ShoppingBag className="h-5 w-5" />
              E-commerce Events
            </h3>
            <a href="/dashboard/marketing/tracking/ecommerce" className="text-sm text-primary hover:underline">View all</a>
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 rounded-lg bg-green-50 border border-green-200">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-lg bg-green-100 flex items-center justify-center">
                  <ShoppingBag className="h-4 w-4 text-green-600" />
                </div>
                <div>
                  <p className="font-medium text-sm">Purchase Tracking</p>
                  <p className="text-xs text-muted-foreground">Revenue, items, transaction ID</p>
                </div>
              </div>
              <span className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-green-100 text-green-700 rounded">Active</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-blue-50 border border-blue-200">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-lg bg-blue-100 flex items-center justify-center">
                  <Package className="h-4 w-4 text-blue-600" />
                </div>
                <div>
                  <p className="font-medium text-sm">Add to Cart</p>
                  <p className="text-xs text-muted-foreground">Product, price, quantity</p>
                </div>
              </div>
              <span className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded">Active</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-amber-50 border border-amber-200">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-lg bg-amber-100 flex items-center justify-center">
                  <ArrowRight className="h-4 w-4 text-amber-600" />
                </div>
                <div>
                  <p className="font-medium text-sm">Begin Checkout</p>
                  <p className="text-xs text-muted-foreground">Cart value, items, currency</p>
                </div>
              </div>
              <span className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-amber-100 text-amber-700 rounded">Active</span>
            </div>
          </div>
        </div>

        <div className="rounded-lg border p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold flex items-center gap-2">
              <Users className="h-5 w-5" />
              Lead Generation Events
            </h3>
            <a href="/dashboard/marketing/tracking/conversions" className="text-sm text-primary hover:underline">View all</a>
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 rounded-lg bg-purple-50 border border-purple-200">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-lg bg-purple-100 flex items-center justify-center">
                  <Target className="h-4 w-4 text-purple-600" />
                </div>
                <div>
                  <p className="font-medium text-sm">Generate Lead</p>
                  <p className="text-xs text-muted-foreground">Form type, source page, value</p>
                </div>
              </div>
              <span className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-purple-100 text-purple-700 rounded">Active</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-pink-50 border border-pink-200">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-lg bg-pink-100 flex items-center justify-center">
                  <Zap className="h-4 w-4 text-pink-600" />
                </div>
                <div>
                  <p className="font-medium text-sm">Demo Requested</p>
                  <p className="text-xs text-muted-foreground">Product, source page</p>
                </div>
              </div>
              <span className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-pink-100 text-pink-700 rounded">Active</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-indigo-50 border border-indigo-200">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-lg bg-indigo-100 flex items-center justify-center">
                  <Users className="h-4 w-4 text-indigo-600" />
                </div>
                <div>
                  <p className="font-medium text-sm">Sign Up</p>
                  <p className="text-xs text-muted-foreground">Method, plan</p>
                </div>
              </div>
              <span className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-indigo-100 text-indigo-700 rounded">Active</span>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Links */}
      <div className="rounded-lg border p-6 bg-gray-50">
        <h3 className="font-semibold mb-4">Quick Actions</h3>
        <div className="grid gap-3 md:grid-cols-4">
          <a href="/dashboard/marketing/tracking/events" className="p-4 rounded-lg bg-white border hover:border-primary/50 transition-colors">
            <h4 className="font-medium flex items-center gap-2"><Settings className="h-5 w-5" /> Manage Events</h4>
            <p className="text-sm text-muted-foreground mt-1">Define custom events and map to GA4/Ads/Pixel</p>
          </a>
          <a href="/dashboard/marketing/tracking/conversions" className="p-4 rounded-lg bg-white border hover:border-primary/50 transition-colors">
            <h4 className="font-medium flex items-center gap-2"><Target className="h-5 w-5" /> Conversion Tracking</h4>
            <p className="text-sm text-muted-foreground mt-1">Set up conversion goals and value tracking</p>
          </a>
          <a href="/dashboard/marketing/tracking/ecommerce" className="p-4 rounded-lg bg-white border hover:border-primary/50 transition-colors">
            <h4 className="font-medium flex items-center gap-2"><ShoppingBag className="h-5 w-5" /> E-commerce Tracking</h4>
            <p className="text-sm text-muted-foreground mt-1">Configure purchase, cart, checkout events</p>
          </a>
          <a href="/dashboard/marketing/tracking/attribution" className="p-4 rounded-lg bg-white border hover:border-primary/50 transition-colors">
            <h4 className="font-medium flex items-center gap-2"><BarChart3 className="h-5 w-5" /> Attribution</h4>
            <p className="text-sm text-muted-foreground mt-1">Analyze traffic sources and conversion paths</p>
          </a>
        </div>
      </div>
    </div>
  );
}

// Import icons needed
import { CheckCircle2, XCircle } from "lucide-react";