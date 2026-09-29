"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  Globe2,
  Wrench,
  Users,
  Activity,
  CheckCircle2,
  Clock,
  Coins,
  Eye,
  Repeat2,
  TrendingUp,
  Filter,
  Gauge,
  Lightbulb,
  Search,
  Store,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { KpiCard } from "@/components/ai-tools/kpi-card";
import { DateRangeFilter, type RangeValue } from "@/components/ai-tools/date-range-filter";
import { UsageTrend, type UsagePoint } from "@/components/ai-tools/charts/usage-trend";
import { RankBar } from "@/components/ai-tools/charts/rank-bar";
import { FunnelChart, type FunnelStage } from "@/components/ai-tools/charts/funnel-chart";
import { PerformanceTable, type PerfRow } from "@/components/ai-tools/analytics/performance-table";
import { InsightCard } from "@/components/ai-tools/insight-card";
import { MarketTab } from "@/components/ai-tools/market-tab";
import { formatPrice, formatDateTime } from "@/lib/utils";
import type { Insight } from "@/lib/tools/insights";

type TabKey =
  | "global"
  | "tool"
  | "user"
  | "funnel"
  | "performance"
  | "insights"
  | "seo"
  | "market";

const TAB_KEYS: TabKey[] = ["global", "tool", "user", "funnel", "performance", "insights", "seo", "market"];

interface GlobalScope {
  toolCounts: { total: number; byStatus: Record<string, number>; byAccess: Record<string, number> };
  adoption: UsagePoint[];
  retention: { usersActive2PlusWeeks: number; pctOfActive: number };
  activeUsers: number;
  estimatedCost: number;
  credits: number;
  executions: number;
}

interface ToolScope {
  tool: { _id: string; name: string; slug: string; accessModel: string };
  kpis: Record<string, number>;
  series: UsagePoint[];
  breakdown: { name: string; value: number }[];
}

interface UserScope {
  topUsers: {
    userId: string;
    name: string;
    executions: number;
    credits: number;
    estimatedCost: number;
    toolsUsed: number;
    lastActive: string;
  }[];
  multiToolUsers: number;
  accessSplit: { accessModel: string; executions: number; credits: number }[];
  stoppedUsers: { userId: string; name: string; lastActive: string }[];
}

interface FunnelScope {
  tool: { _id: string; name: string; slug: string } | null;
  stages: FunnelStage[];
  totals: Record<string, number>;
}

interface SeoScope {
  rows: {
    toolId: string;
    name: string;
    slug: string;
    status: string;
    checks: { metaTitle: boolean; metaDescription: boolean; keywords: boolean; canonicalUrl: boolean };
    completeness: number;
    indexed: number | null;
    source: string;
  }[];
  summary: { totalTools: number; avgCompleteness: number; fullyOptimized: number; missingMeta: number };
  searchConsole: { connected: boolean; source: string; note: string };
}

interface ToolOption {
  _id: string;
  name: string;
}

function AnalyticsContent() {
  const searchParams = useSearchParams();
  const [tab, setTab] = useState<TabKey>("global");
  const [range, setRange] = useState<RangeValue>({ range: "30d" });
  const [globalData, setGlobalData] = useState<GlobalScope | null>(null);
  const [toolData, setToolData] = useState<ToolScope | null>(null);
  const [userData, setUserData] = useState<UserScope | null>(null);
  const [funnelData, setFunnelData] = useState<FunnelScope | null>(null);
  const [perfData, setPerfData] = useState<{ rows: PerfRow[]; totals: Record<string, number> } | null>(null);
  const [seoData, setSeoData] = useState<SeoScope | null>(null);
  const [insights, setInsights] = useState<Insight[] | null>(null);
  const [toolOptions, setToolOptions] = useState<ToolOption[]>([]);
  const [toolId, setToolId] = useState("");
  const [funnelToolId, setFunnelToolId] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const rangeParams = useMemo(() => {
    const p = new URLSearchParams({ range: range.range });
    if (range.start) p.set("start", range.start);
    if (range.end) p.set("end", range.end);
    return p;
  }, [range]);

  const fetchScope = useCallback(
    async (activeTab: TabKey) => {
      if (activeTab === "market") return; // MarketTab manages its own data
      setLoading(true);
      setError("");
      try {
        if (activeTab === "insights") {
          const res = await fetch(`/api/ai-tools/insights?${rangeParams}`);
          const body = await res.json().catch(() => ({}));
          if (res.status === 401) {
            window.location.href = "/login?callbackUrl=/dashboard/ai-tools/analytics";
            return;
          }
          if (!res.ok) {
            setError(body.error || "Failed to load insights.");
            return;
          }
          setInsights(body.data.insights);
          return;
        }

        const params = new URLSearchParams(rangeParams);
        params.set("scope", activeTab);
        if (activeTab === "tool") {
          if (!toolId) {
            setLoading(false);
            return;
          }
          params.set("toolId", toolId);
        }
        if (activeTab === "funnel" && funnelToolId !== "all") {
          params.set("toolId", funnelToolId);
        }
        const res = await fetch(`/api/ai-tools/analytics?${params}`);
        const body = await res.json().catch(() => ({}));
        if (res.status === 401) {
          window.location.href = "/login?callbackUrl=/dashboard/ai-tools/analytics";
          return;
        }
        if (!res.ok) {
          setError(body.error || "Failed to load analytics.");
          return;
        }
        if (!body.success) return;
        if (activeTab === "global") setGlobalData(body.data);
        if (activeTab === "tool") setToolData(body.data);
        if (activeTab === "user") setUserData(body.data);
        if (activeTab === "funnel") setFunnelData(body.data);
        if (activeTab === "performance") {
          setPerfData({ rows: body.data.rows, totals: body.data.totals });
        }
        if (activeTab === "seo") setSeoData(body.data);
      } catch {
        setError("Failed to load analytics. Please try again.");
      } finally {
        setLoading(false);
      }
    },
    [rangeParams, toolId, funnelToolId]
  );

  // Deep-link support: ?tab= &toolId=
  useEffect(() => {
    const t = searchParams.get("tab");
    if (t && TAB_KEYS.includes(t as TabKey)) {
      setTab(t as TabKey);
    }
    const tid = searchParams.get("toolId");
    if (tid) {
      setToolId(tid);
      setFunnelToolId(tid);
    }
  }, [searchParams]);

  useEffect(() => {
    fetch(`/api/ai-tools?limit=100&allStatuses=true`)
      .then((r) => r.json())
      .then((d) => {
        if (d.success && Array.isArray(d.data)) {
          const opts = d.data.map((t: { _id: string; name: string }) => ({ _id: t._id, name: t.name }));
          setToolOptions(opts);
          if (opts.length > 0) setToolId((prev) => prev || opts[0]._id);
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetchScope(tab);
  }, [tab, fetchScope]);

  const renderSkeleton = () => (
    <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
      {Array.from({ length: 8 }).map((_, i) => (
        <Skeleton key={i} className="h-28 rounded-lg" />
      ))}
    </div>
  );

  const toolSelect = (
    <Select value={toolId} onValueChange={setToolId}>
      <SelectTrigger className="w-[280px]" aria-label="Select tool">
        <SelectValue placeholder="Select a tool" />
      </SelectTrigger>
      <SelectContent>
        {toolOptions.map((t) => (
          <SelectItem key={t._id} value={t._id}>
            {t.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold">Analytics</h2>
          <p className="text-sm text-muted-foreground">
            Global, per-tool, per-user, funnel, performance, insights & SEO
          </p>
        </div>
        <DateRangeFilter value={range} onChange={setRange} />
      </div>

      {error && (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="p-4 text-sm text-amber-800">{error}</CardContent>
        </Card>
      )}

      <Tabs value={tab} onValueChange={(v) => setTab(v as TabKey)}>
        <TabsList className="h-auto flex-wrap">
          <TabsTrigger value="global">
            <Globe2 className="mr-1.5 h-4 w-4" /> Global
          </TabsTrigger>
          <TabsTrigger value="tool">
            <Wrench className="mr-1.5 h-4 w-4" /> Tool
          </TabsTrigger>
          <TabsTrigger value="user">
            <Users className="mr-1.5 h-4 w-4" /> Users
          </TabsTrigger>
          <TabsTrigger value="funnel">
            <Filter className="mr-1.5 h-4 w-4" /> Funnel
          </TabsTrigger>
          <TabsTrigger value="performance">
            <Gauge className="mr-1.5 h-4 w-4" /> Performance
          </TabsTrigger>
          <TabsTrigger value="insights">
            <Lightbulb className="mr-1.5 h-4 w-4" /> Insights
          </TabsTrigger>
          <TabsTrigger value="seo">
            <Search className="mr-1.5 h-4 w-4" /> SEO
          </TabsTrigger>
          <TabsTrigger value="market">
            <Store className="mr-1.5 h-4 w-4" /> Market
          </TabsTrigger>
        </TabsList>

        {/* ── Global ── */}
        <TabsContent value="global" className="space-y-4">
          {loading && !globalData ? (
            renderSkeleton()
          ) : globalData ? (
            <>
              <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
                <KpiCard label="Tools" value={globalData.toolCounts.total} icon={Wrench} href="/dashboard/ai-tools/tools" />
                <KpiCard
                  label="Published"
                  value={globalData.toolCounts.byStatus.published || 0}
                  icon={CheckCircle2}
                  iconColor="text-emerald-500"
                />
                <KpiCard label="Executions" value={globalData.executions} icon={Activity} sublabel="in range" />
                <KpiCard label="Active users" value={globalData.activeUsers} icon={Users} sublabel="in range" />
                <KpiCard
                  label="Retention (2+ wk)"
                  value={`${globalData.retention.pctOfActive}%`}
                  icon={Repeat2}
                  sublabel={`${globalData.retention.usersActive2PlusWeeks} users`}
                />
                <KpiCard label="Credits" value={globalData.credits} icon={Coins} iconColor="text-amber-500" sublabel="in range" />
                <KpiCard label="Est. API cost" value={formatPrice(globalData.estimatedCost)} icon={TrendingUp} iconColor="text-red-500" sublabel="in range" />
                <KpiCard
                  label="Subscription tools"
                  value={globalData.toolCounts.byAccess.subscription || 0}
                  icon={Globe2}
                  iconColor="text-blue-500"
                />
              </div>
              <div className="grid gap-4 lg:grid-cols-3">
                <Card className="lg:col-span-2">
                  <CardHeader>
                    <CardTitle className="text-base">Weekly adoption</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <UsageTrend data={globalData.adoption} />
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Tools by access model</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {(
                        [
                          ["Free", globalData.toolCounts.byAccess.free || 0],
                          ["Freemium", globalData.toolCounts.byAccess.freemium || 0],
                          ["Subscription", globalData.toolCounts.byAccess.subscription || 0],
                        ] as [string, number][]
                      ).map(([name, value]) => (
                        <div key={name} className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">{name}</span>
                          <span className="tabular-nums">{value} tools</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </>
          ) : null}
        </TabsContent>

        {/* ── Tool ── */}
        <TabsContent value="tool" className="space-y-4">
          <div className="flex items-center gap-3">
            {toolSelect}
            {loading && <span className="text-sm text-muted-foreground">Loading…</span>}
          </div>

          {toolData && !loading ? (
            <>
              <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
                <KpiCard label="Executions" value={toolData.kpis.executions} icon={Activity} sublabel={toolData.tool.name} />
                <KpiCard label="Success rate" value={`${toolData.kpis.successRate}%`} icon={CheckCircle2} iconColor="text-emerald-500" sublabel={`${toolData.kpis.success} ok / ${toolData.kpis.failure} failed`} />
                <KpiCard label="Avg duration" value={`${toolData.kpis.avgDurationMs}ms`} icon={Clock} />
                <KpiCard label="Unique users" value={toolData.kpis.uniqueUsers} icon={Users} sublabel="in range" />
                <KpiCard label="Repeat rate" value={`${toolData.kpis.repeatRate}%`} icon={Repeat2} sublabel="2+ runs" />
                <KpiCard label="Views → runs" value={`${toolData.kpis.viewsToExecPct}%`} icon={Eye} sublabel={`${toolData.kpis.views} views`} />
                <KpiCard label="Credits" value={toolData.kpis.credits} icon={Coins} iconColor="text-amber-500" />
                <KpiCard label="Est. cost" value={formatPrice(toolData.kpis.estimatedCost)} icon={TrendingUp} iconColor="text-red-500" />
              </div>
              <div className="grid gap-4 lg:grid-cols-3">
                <Card className="lg:col-span-2">
                  <CardHeader>
                    <CardTitle className="text-base">Executions & users</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <UsageTrend data={toolData.series} />
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Success / failure</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <RankBar data={toolData.breakdown} color="#16a34a" />
                  </CardContent>
                </Card>
              </div>
            </>
          ) : (
            !loading && (
              <Card>
                <CardContent className="p-8 text-center text-sm text-muted-foreground">
                  {toolOptions.length === 0 ? "No tools yet." : "Select a tool to view analytics."}
                </CardContent>
              </Card>
            )
          )}
        </TabsContent>

        {/* ── Users ── */}
        <TabsContent value="user" className="space-y-4">
          {loading && !userData ? (
            renderSkeleton()
          ) : userData ? (
            <>
              <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
                <KpiCard label="Users (top list)" value={userData.topUsers.length} icon={Users} sublabel="in range" />
                <KpiCard label="Multi-tool users" value={userData.multiToolUsers} icon={Repeat2} sublabel="2+ tools" />
                <KpiCard label="Stopped users" value={userData.stoppedUsers.length} icon={Clock} sublabel="inactive in range" />
                <KpiCard
                  label="Free executions"
                  value={userData.accessSplit.find((s) => s.accessModel === "free")?.executions || 0}
                  icon={Activity}
                  iconColor="text-emerald-500"
                />
              </div>
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Top users</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>User</TableHead>
                        <TableHead className="text-right">Executions</TableHead>
                        <TableHead className="text-right">Credits</TableHead>
                        <TableHead className="text-right">Tools</TableHead>
                        <TableHead>Last active</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {userData.topUsers.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center text-sm text-muted-foreground py-8">
                            No user activity in this range.
                          </TableCell>
                        </TableRow>
                      ) : (
                        userData.topUsers.map((u) => (
                          <TableRow key={u.userId}>
                            <TableCell className="font-medium">{u.name}</TableCell>
                            <TableCell className="text-right tabular-nums">{u.executions}</TableCell>
                            <TableCell className="text-right tabular-nums">{u.credits}</TableCell>
                            <TableCell className="text-right tabular-nums">{u.toolsUsed}</TableCell>
                            <TableCell className="text-sm text-muted-foreground">{formatDateTime(u.lastActive)}</TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
              {userData.stoppedUsers.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Stopped users (active before range)</CardTitle>
                  </CardHeader>
                  <CardContent className="flex flex-wrap gap-2">
                    {userData.stoppedUsers.map((u) => (
                      <span key={u.userId} className="rounded-full border px-3 py-1 text-xs text-muted-foreground">
                        {u.name} · last {formatDateTime(u.lastActive)}
                      </span>
                    ))}
                  </CardContent>
                </Card>
              )}
            </>
          ) : null}
        </TabsContent>

        {/* ── Funnel ── */}
        <TabsContent value="funnel" className="space-y-4">
          <div className="flex items-center gap-3">
            <Select value={funnelToolId} onValueChange={setFunnelToolId}>
              <SelectTrigger className="w-[280px]" aria-label="Select tool for funnel">
                <SelectValue placeholder="All tools" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All tools</SelectItem>
                {toolOptions.map((t) => (
                  <SelectItem key={t._id} value={t._id}>
                    {t.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {loading && <span className="text-sm text-muted-foreground">Loading…</span>}
          </div>
          {funnelData && !loading ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  Conversion funnel {funnelData.tool ? `— ${funnelData.tool.name}` : "(all tools)"}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <FunnelChart stages={funnelData.stages} />
                <div className="grid grid-cols-2 gap-4 border-t pt-4 md:grid-cols-4">
                  <div>
                    <p className="text-xs text-muted-foreground">Executions</p>
                    <p className="text-lg font-semibold tabular-nums">{funnelData.totals.executions ?? 0}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Credits</p>
                    <p className="text-lg font-semibold tabular-nums">{funnelData.totals.credits ?? 0}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Est. cost</p>
                    <p className="text-lg font-semibold tabular-nums">{formatPrice(funnelData.totals.cost ?? 0)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Conversions</p>
                    <p className="text-lg font-semibold tabular-nums">{funnelData.totals.conversions ?? 0}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            !loading && (
              <Card>
                <CardContent className="p-8 text-center text-sm text-muted-foreground">
                  No funnel data in this range.
                </CardContent>
              </Card>
            )
          )}
        </TabsContent>

        {/* ── Performance ── */}
        <TabsContent value="performance" className="space-y-4">
          {loading && !perfData ? (
            renderSkeleton()
          ) : perfData ? (
            <>
              <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
                <KpiCard label="Executions" value={perfData.totals.executions || 0} icon={Activity} sublabel="in range" />
                <KpiCard label="Est. API cost" value={formatPrice(perfData.totals.estimatedCost || 0)} icon={TrendingUp} iconColor="text-red-500" />
                <KpiCard label="Credits" value={perfData.totals.credits || 0} icon={Coins} iconColor="text-amber-500" />
                <KpiCard label="Revenue" value={formatPrice(perfData.totals.revenue || 0)} icon={CheckCircle2} iconColor="text-emerald-500" />
              </div>
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Per-tool performance</CardTitle>
                </CardHeader>
                <CardContent>
                  <PerformanceTable rows={perfData.rows} />
                </CardContent>
              </Card>
            </>
          ) : null}
        </TabsContent>

        {/* ── Insights ── */}
        <TabsContent value="insights" className="space-y-4">
          {loading && !insights ? (
            renderSkeleton()
          ) : insights ? (
            insights.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center text-sm text-muted-foreground">
                  No insights for this range — usage is too low or too stable to flag anything.
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {insights.map((i) => (
                  <InsightCard key={i.id} insight={i} />
                ))}
              </div>
            )
          ) : null}
        </TabsContent>

        {/* ── SEO ── */}
        <TabsContent value="seo" className="space-y-4">
          {loading && !seoData ? (
            renderSkeleton()
          ) : seoData ? (
            <>
              <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
                <KpiCard label="Tools" value={seoData.summary.totalTools} icon={Wrench} />
                <KpiCard label="Avg completeness" value={`${seoData.summary.avgCompleteness}%`} icon={Search} iconColor="text-blue-500" />
                <KpiCard label="Fully optimized" value={seoData.summary.fullyOptimized} icon={CheckCircle2} iconColor="text-emerald-500" />
                <KpiCard label="Missing meta" value={seoData.summary.missingMeta} icon={Eye} iconColor="text-amber-500" />
              </div>
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Tool SEO completeness</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Tool</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-center">Meta title</TableHead>
                        <TableHead className="text-center">Meta description</TableHead>
                        <TableHead className="text-center">Keywords</TableHead>
                        <TableHead className="text-center">Canonical</TableHead>
                        <TableHead className="text-right">Complete</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {seoData.rows.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} className="py-8 text-center text-sm text-muted-foreground">
                            No tools yet.
                          </TableCell>
                        </TableRow>
                      ) : (
                        seoData.rows.map((r) => (
                          <TableRow key={r.toolId}>
                            <TableCell className="font-medium">{r.name}</TableCell>
                            <TableCell>
                              <Badge variant="outline" className="text-[10px]">{r.status}</Badge>
                            </TableCell>
                            <TableCell className="text-center">{r.checks.metaTitle ? "✓" : "✗"}</TableCell>
                            <TableCell className="text-center">{r.checks.metaDescription ? "✓" : "✗"}</TableCell>
                            <TableCell className="text-center">{r.checks.keywords ? "✓" : "✗"}</TableCell>
                            <TableCell className="text-center">{r.checks.canonicalUrl ? "✓" : "✗"}</TableCell>
                            <TableCell className="text-right tabular-nums">{r.completeness}%</TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
              <Card className="border-dashed">
                <CardContent className="p-6 text-sm text-muted-foreground">
                  <p className="font-medium text-foreground">Google Search Console not connected</p>
                  <p className="mt-1">{seoData.searchConsole.note}</p>
                  <p className="mt-2 text-xs">
                    Source: <code>{seoData.searchConsole.source}</code> — impressions, clicks, and CTR are shown
                    honestly as empty until a real integration exists.
                  </p>
                </CardContent>
              </Card>
            </>
          ) : null}
        </TabsContent>

        {/* ── Market ── */}
        <TabsContent value="market" className="space-y-4">
          <MarketTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default function AiToolsAnalyticsPage() {
  return (
    <Suspense fallback={<Skeleton className="h-64 w-full" />}>
      <AnalyticsContent />
    </Suspense>
  );
}
