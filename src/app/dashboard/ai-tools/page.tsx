"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Wrench,
  CheckCircle2,
  FileText,
  Gift,
  Sparkles,
  Crown,
  Users,
  Activity,
  UserPlus,
  Zap,
  CalendarDays,
  Coins,
  DollarSign,
  TrendingUp,
  Gauge,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { KpiCard } from "@/components/ai-tools/kpi-card";
import { DateRangeFilter, type RangeValue } from "@/components/ai-tools/date-range-filter";
import { UsageTrend } from "@/components/ai-tools/charts/usage-trend";
import { AccessMix } from "@/components/ai-tools/charts/access-mix";
import { RankBar } from "@/components/ai-tools/charts/rank-bar";
import { formatPrice } from "@/lib/utils";

interface OverviewData {
  kpis: Record<string, number>;
  series: {
    byDay: { date: string; executions: number; users: number; credits: number; revenue: number }[];
    accessMix: { name: string; value: number }[];
    topTools: { name: string; value: number }[];
    growing: { name: string; value: number }[];
    declining: { name: string; value: number }[];
  };
  range: { from: string; to: string; label: string; key: string };
}

export default function AiToolsOverviewPage() {
  const [range, setRange] = useState<RangeValue>({ range: "30d" });
  const [data, setData] = useState<OverviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({ range: range.range });
      if (range.start) params.set("start", range.start);
      if (range.end) params.set("end", range.end);
      const res = await fetch(`/api/ai-tools/overview?${params}`);
      const body = await res.json().catch(() => ({}));
      if (res.status === 401) {
        window.location.href = "/login?callbackUrl=/dashboard/ai-tools";
        return;
      }
      if (!res.ok) {
        setError(body.error || "Failed to load overview.");
        return;
      }
      if (body.success) setData(body.data);
    } catch {
      setError("Failed to load overview. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [range]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const k = data?.kpis;

  const cards = k
    ? [
        { label: "Total tools", value: k.totalTools, icon: Wrench, href: "/dashboard/ai-tools/tools" },
        { label: "Published", value: k.publishedTools, icon: CheckCircle2, iconColor: "text-emerald-500", href: "/dashboard/ai-tools/tools" },
        { label: "Drafts", value: k.draftTools, icon: FileText, iconColor: "text-amber-500", href: "/dashboard/ai-tools/tools" },
        { label: "Free tools", value: k.freeTools, icon: Gift, iconColor: "text-emerald-500" },
        { label: "Freemium tools", value: k.freemiumTools, icon: Sparkles, iconColor: "text-amber-500" },
        { label: "Subscription tools", value: k.subscriptionTools, icon: Crown, iconColor: "text-blue-500" },
        { label: "Total users", value: k.totalUsers, icon: Users },
        { label: "Active users", value: k.activeUsers, icon: Activity, iconColor: "text-blue-500", sublabel: "in range" },
        { label: "New users", value: k.newUsers, icon: UserPlus, iconColor: "text-emerald-500", sublabel: "first use in range" },
        { label: "Executions", value: k.executions, icon: Zap, iconColor: "text-emerald-500", sublabel: "in range" },
        { label: "Executions today", value: k.executionsToday, icon: CalendarDays },
        { label: "Credits used", value: k.credits, icon: Coins, iconColor: "text-amber-500", sublabel: "in range" },
        { label: "Est. API cost", value: formatPrice(k.estimatedCost), icon: DollarSign, iconColor: "text-red-500", sublabel: "in range" },
        { label: "Revenue", value: formatPrice(k.revenue), icon: DollarSign, iconColor: "text-emerald-500", sublabel: "in range" },
        { label: "Conversions", value: k.conversions, icon: TrendingUp, sublabel: "upgrade conversions" },
        { label: "Avg runs / user", value: k.avgExecutionsPerUser, icon: Gauge, sublabel: "active users" },
      ]
    : [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold">Overview</h2>
          {data?.range && (
            <p className="text-sm text-muted-foreground">{data.range.label}</p>
          )}
        </div>
        <DateRangeFilter value={range} onChange={setRange} />
      </div>

      {error && (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="p-4 text-sm text-amber-800">{error}</CardContent>
        </Card>
      )}

      {loading && !data ? (
        <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
          {Array.from({ length: 16 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-lg" />
          ))}
        </div>
      ) : (
        <>
          <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
            {cards.map((c) => (
              <KpiCard key={c.label} {...c} />
            ))}
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="text-base">Usage trend</CardTitle>
              </CardHeader>
              <CardContent>
                <UsageTrend data={data?.series.byDay || []} />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Access mix</CardTitle>
              </CardHeader>
              <CardContent>
                <AccessMix data={data?.series.accessMix || []} />
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Top tools</CardTitle>
              </CardHeader>
              <CardContent>
                <RankBar data={data?.series.topTools || []} color="#2563eb" />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Fastest growing (7d vs prior)</CardTitle>
              </CardHeader>
              <CardContent>
                <RankBar data={data?.series.growing || []} color="#16a34a" />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Declining (7d vs prior)</CardTitle>
              </CardHeader>
              <CardContent>
                <RankBar data={data?.series.declining || []} color="#ef4444" />
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
