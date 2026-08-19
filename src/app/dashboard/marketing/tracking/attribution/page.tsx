"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { Loader2, RefreshCw, BarChart3, Users, Globe, Search, Target, ArrowRight, TrendingUp, ExternalLink, Filter, Calendar, DollarSign, ShoppingBag, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

interface AttributionData {
  topSources: Array<{
    source: string;
    medium: string;
    visitors: number;
    conversions: number;
    conversionRate: number;
    revenue: number;
  }>;
  topCampaigns: Array<{
    campaign: string;
    source: string;
    visitors: number;
    conversions: number;
    cost: number;
    roas: number;
  }>;
  funnel: Array<{
    step: string;
    count: number;
    dropoff: number;
  }>;
  assistedConversions: Array<{
    channel: string;
    assisted: number;
    lastClick: number;
  }>;
  dateRange: { start: string; end: string };
  totalVisitors: number;
  totalConversions: number;
  totalRevenue: number;
}

export default function AttributionPage() {
  const { data: session, status } = useSession();
  const [data, setData] = useState<AttributionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [dateRange, setDateRange] = useState({ start: "", end: "" });

  useEffect(() => {
    if (status === "loading") return;
    if (status === "unauthenticated") {
      window.location.href = "/login?callbackUrl=/dashboard/marketing/tracking/attribution";
      return;
    }
    fetchData();
  }, [status]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (dateRange.start) params.set("start", dateRange.start);
      if (dateRange.end) params.set("end", dateRange.end);
      const res = await fetch(`/api/marketing/tracking/attribution?${params}`);
      const result = await res.json();
      if (result.success) {
        setData(result.data);
      }
    } catch (error) {
      console.error("Failed to fetch attribution data:", error);
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
    return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 0 }).format(num);
  };

  const formatPercent = (num: number) => {
    return num.toFixed(2) + "%";
  };

  if (status === "loading") {
    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold">Attribution Analysis</h2>
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

  if (!data) {
    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold">Attribution Analysis</h2>
        <div className="rounded-lg border p-8 text-center text-muted-foreground">
          No attribution data available. Connect Google Analytics to see traffic sources and conversion paths.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <BarChart3 className="h-6 w-6 text-primary" />
            Attribution Analysis
          </h2>
          <p className="text-sm text-muted-foreground mt-1">Analyze traffic sources, campaigns, and conversion paths</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <input
              type="date"
              value={dateRange.start}
              onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
              className="rounded-lg border px-3 py-2 text-sm"
            />
            <span className="text-muted-foreground">to</span>
            <input
              type="date"
              value={dateRange.end}
              onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
              className="rounded-lg border px-3 py-2 text-sm"
            />
          </div>
          <button onClick={fetchData} disabled={refreshing} className="inline-flex items-center gap-2 text-sm border rounded-lg px-3 py-2 hover:bg-accent transition-colors disabled:opacity-50">
            {refreshing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            Apply
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        {[
          { label: "Total Visitors", value: formatNumber(data.totalVisitors), icon: Users, color: "text-blue-500", bg: "bg-blue-50" },
          { label: "Total Conversions", value: formatNumber(data.totalConversions), icon: Target, color: "text-green-500", bg: "bg-green-50" },
          { label: "Total Revenue", value: formatCurrency(data.totalRevenue), icon: DollarSign, color: "text-yellow-500", bg: "bg-yellow-50" },
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

      {/* Conversion Funnel */}
      <div className="rounded-lg border p-6">
        <h3 className="font-semibold mb-4 flex items-center gap-2">
          <ArrowRight className="h-5 w-5" />
          Conversion Funnel
        </h3>
        <div className="flex items-end justify-between h-64 px-4">
          {data.funnel.map((step, index) => {
            const maxCount = Math.max(...data.funnel.map((s) => s.count));
            const heightPercent = maxCount > 0 ? (step.count / maxCount) * 100 : 0;
            return (
              <div key={step.step} className="flex flex-col items-center gap-2 flex-1">
                <div
                  className="w-full rounded-t bg-primary/10 border border-primary/20 transition-all"
                  style={{ height: `${Math.max(heightPercent, 5)}%`, minHeight: "20px" }}
                />
                <div className="text-center w-full">
                  <p className="font-medium text-sm">{step.step}</p>
                  <p className="text-2xl font-bold text-primary">{formatNumber(step.count)}</p>
                  {step.dropoff > 0 && (
                    <p className="text-xs text-red-500">-{formatPercent(step.dropoff)}%</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
        <div className="flex justify-between mt-4 text-xs text-muted-foreground">
          {data.funnel.map((step) => (
            <div key={step.step} className="flex-1 text-center">{step.step}</div>
          ))}
        </div>
      </div>

      {/* Top Traffic Sources */}
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-lg border p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold flex items-center gap-2">
              <Globe className="h-5 w-5" />
              Top Traffic Sources
            </h3>
          </div>
          {data.topSources.length === 0 ? (
            <p className="text-sm text-muted-foreground">No traffic source data available</p>
          ) : (
            <div className="space-y-3">
              {data.topSources.slice(0, 10).map((source, index) => (
                <div key={`${source.source}-${source.medium}`} className="flex items-center justify-between p-3 rounded-lg border hover:bg-accent/50">
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-muted-foreground w-6">{index + 1}.</span>
                    <div>
                      <p className="font-medium text-sm capitalize">{source.source}</p>
                      <p className="text-xs text-muted-foreground">{source.medium}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium">{formatNumber(source.visitors)} visitors</p>
                    <p className="text-xs text-green-600">
                      {formatNumber(source.conversions)} conv · {formatPercent(source.conversionRate)}
                    </p>
                    <p className="text-xs text-yellow-600">{formatCurrency(source.revenue)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-lg border p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold flex items-center gap-2">
              <Target className="h-5 w-5" />
              Top Campaigns
            </h3>
          </div>
          {data.topCampaigns.length === 0 ? (
            <p className="text-sm text-muted-foreground">No campaign data available</p>
          ) : (
            <div className="space-y-3">
              {data.topCampaigns.slice(0, 10).map((campaign, index) => (
                <div key={campaign.campaign} className="flex items-center justify-between p-3 rounded-lg border hover:bg-accent/50">
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-muted-foreground w-6">{index + 1}.</span>
                    <div>
                      <p className="font-medium text-sm">{campaign.campaign}</p>
                      <p className="text-xs text-muted-foreground">{campaign.source}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium">{formatNumber(campaign.visitors)} visitors</p>
                    <p className="text-xs text-green-600">
                      {formatNumber(campaign.conversions)} conv
                    </p>
                    {campaign.cost > 0 && (
                      <p className="text-xs text-blue-600">ROAS: {campaign.roas.toFixed(2)}x</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-lg border p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold flex items-center gap-2">
              <ArrowRight className="h-5 w-5" />
              Assisted Conversions
            </h3>
          </div>
          {data.assistedConversions.length === 0 ? (
            <p className="text-sm text-muted-foreground">No assisted conversion data available</p>
          ) : (
            <div className="space-y-3">
              {data.assistedConversions.map((channel, index) => (
                <div key={channel.channel} className="flex items-center justify-between p-3 rounded-lg border hover:bg-accent/50">
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-muted-foreground w-6">{index + 1}.</span>
                    <p className="font-medium text-sm capitalize">{channel.channel}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">Assisted</p>
                    <p className="text-sm font-medium text-purple-600">{formatNumber(channel.assisted)}</p>
                    <p className="text-xs text-muted-foreground">Last Click</p>
                    <p className="text-sm font-medium text-green-600">{formatNumber(channel.lastClick)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-lg border p-6 bg-blue-50 border-blue-200">
          <h3 className="font-semibold text-blue-900 mb-4 flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Attribution Models Available
          </h3>
          <div className="grid gap-3 md:grid-cols-2">
            {[
              { name: "Last Click", description: "100% credit to last touchpoint", icon: ArrowRight },
              { name: "First Click", description: "100% credit to first touchpoint", icon: Search },
              { name: "Linear", description: "Equal credit to all touchpoints", icon: BarChart3 },
              { name: "Time Decay", description: "More credit to recent touchpoints", icon: TrendingUp },
              { name: "Position Based", description: "40% first, 40% last, 20% middle", icon: Target },
              { name: "Data Driven", description: "ML-based attribution (GA4 360)", icon: Zap },
            ].map((model) => (
              <div key={model.name} className="flex items-center gap-3 p-3 rounded-lg bg-white border">
                <model.icon className="h-5 w-5 text-blue-500" />
                <div>
                  <p className="font-medium text-sm">{model.name}</p>
                  <p className="text-xs text-blue-700">{model.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}