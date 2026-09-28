"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
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
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
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
import { formatPrice, formatDateTime } from "@/lib/utils";

type TabKey = "global" | "tool" | "user";

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

interface UserRow {
  userId: string;
  name: string;
  executions: number;
  credits: number;
  estimatedCost: number;
  toolsUsed: number;
  lastActive: string;
}

interface UserScope {
  topUsers: UserRow[];
  multiToolUsers: number;
  accessSplit: { accessModel: string; executions: number; credits: number }[];
  stoppedUsers: { userId: string; name: string; lastActive: string }[];
}

interface ToolOption {
  _id: string;
  name: string;
}

export default function AiToolsAnalyticsPage() {
  const [tab, setTab] = useState<TabKey>("global");
  const [range, setRange] = useState<RangeValue>({ range: "30d" });
  const [globalData, setGlobalData] = useState<GlobalScope | null>(null);
  const [toolData, setToolData] = useState<ToolScope | null>(null);
  const [userData, setUserData] = useState<UserScope | null>(null);
  const [toolOptions, setToolOptions] = useState<ToolOption[]>([]);
  const [toolId, setToolId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [sort, setSort] = useState<{ key: keyof UserRow; dir: "asc" | "desc" }>({
    key: "executions",
    dir: "desc",
  });

  const rangeParams = useMemo(() => {
    const p = new URLSearchParams({ range: range.range });
    if (range.start) p.set("start", range.start);
    if (range.end) p.set("end", range.end);
    return p;
  }, [range]);

  const fetchScope = useCallback(
    async (scope: TabKey) => {
      setLoading(true);
      setError("");
      try {
        const params = new URLSearchParams(rangeParams);
        params.set("scope", scope);
        if (scope === "tool") {
          if (!toolId) {
            setLoading(false);
            return;
          }
          params.set("toolId", toolId);
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
        if (scope === "global") setGlobalData(body.data);
        if (scope === "tool") setToolData(body.data);
        if (scope === "user") setUserData(body.data);
      } catch {
        setError("Failed to load analytics. Please try again.");
      } finally {
        setLoading(false);
      }
    },
    [rangeParams, toolId]
  );

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

  const sortedUsers = useMemo(() => {
    if (!userData) return [];
    const rows = [...userData.topUsers];
    rows.sort((a, b) => {
      const av = a[sort.key];
      const bv = b[sort.key];
      if (typeof av === "number" && typeof bv === "number") {
        return sort.dir === "asc" ? av - bv : bv - av;
      }
      return sort.dir === "asc"
        ? String(av).localeCompare(String(bv))
        : String(bv).localeCompare(String(av));
    });
    return rows;
  }, [userData, sort]);

  const toggleSort = (key: keyof UserRow) => {
    setSort((s) => ({ key, dir: s.key === key && s.dir === "desc" ? "asc" : "desc" }));
  };

  const renderSkeleton = () => (
    <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
      {Array.from({ length: 8 }).map((_, i) => (
        <Skeleton key={i} className="h-28 rounded-lg" />
      ))}
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold">Analytics</h2>
          <p className="text-sm text-muted-foreground">Global, per-tool, and per-user insights</p>
        </div>
        <DateRangeFilter value={range} onChange={setRange} />
      </div>

      {error && (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="p-4 text-sm text-amber-800">{error}</CardContent>
        </Card>
      )}

      <Tabs value={tab} onValueChange={(v) => setTab(v as TabKey)}>
        <TabsList>
          <TabsTrigger value="global">
            <Globe2 className="mr-1.5 h-4 w-4" /> Global
          </TabsTrigger>
          <TabsTrigger value="tool">
            <Wrench className="mr-1.5 h-4 w-4" /> Tool-level
          </TabsTrigger>
          <TabsTrigger value="user">
            <Users className="mr-1.5 h-4 w-4" /> User-level
          </TabsTrigger>
        </TabsList>

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
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Weekly adoption</CardTitle>
                </CardHeader>
                <CardContent>
                  <UsageTrend data={globalData.adoption} />
                </CardContent>
              </Card>
            </>
          ) : null}
        </TabsContent>

        <TabsContent value="tool" className="space-y-4">
          <div className="flex items-center gap-3">
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

        <TabsContent value="user" className="space-y-4">
          {loading && !userData ? (
            renderSkeleton()
          ) : userData ? (
            <>
              <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
                <KpiCard label="Users (top list)" value={userData.topUsers.length} icon={Users} sublabel="in range" />
                <KpiCard label="Multi-tool users" value={userData.multiToolUsers} icon={Repeat2} sublabel="2+ tools" />
                <KpiCard
                  label="Stopped users"
                  value={userData.stoppedUsers.length}
                  icon={Clock}
                  sublabel="inactive in range"
                />
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
                        <TableHead className="text-right cursor-pointer" onClick={() => toggleSort("executions")}>
                          Executions {sort.key === "executions" ? (sort.dir === "desc" ? "↓" : "↑") : ""}
                        </TableHead>
                        <TableHead className="text-right cursor-pointer" onClick={() => toggleSort("credits")}>
                          Credits {sort.key === "credits" ? (sort.dir === "desc" ? "↓" : "↑") : ""}
                        </TableHead>
                        <TableHead className="text-right cursor-pointer" onClick={() => toggleSort("toolsUsed")}>
                          Tools {sort.key === "toolsUsed" ? (sort.dir === "desc" ? "↓" : "↑") : ""}
                        </TableHead>
                        <TableHead className="cursor-pointer" onClick={() => toggleSort("lastActive")}>
                          Last active {sort.key === "lastActive" ? (sort.dir === "desc" ? "↓" : "↑") : ""}
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sortedUsers.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center text-sm text-muted-foreground py-8">
                            No user activity in this range.
                          </TableCell>
                        </TableRow>
                      ) : (
                        sortedUsers.map((u) => (
                          <TableRow key={u.userId}>
                            <TableCell className="font-medium">{u.name}</TableCell>
                            <TableCell className="text-right tabular-nums">{u.executions}</TableCell>
                            <TableCell className="text-right tabular-nums">{u.credits}</TableCell>
                            <TableCell className="text-right tabular-nums">{u.toolsUsed}</TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {formatDateTime(u.lastActive)}
                            </TableCell>
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
      </Tabs>
    </div>
  );
}
