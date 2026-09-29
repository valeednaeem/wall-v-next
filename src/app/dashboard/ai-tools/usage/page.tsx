"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Coins, Activity, DollarSign, Users, FileText, RefreshCw } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { KpiCard } from "@/components/ai-tools/kpi-card";
import { DateRangeFilter, type RangeValue } from "@/components/ai-tools/date-range-filter";
import { RankBar } from "@/components/ai-tools/charts/rank-bar";
import { formatPrice, formatDateTime } from "@/lib/utils";

type GroupBy = "tool" | "user" | "provider" | "date";

interface GroupedRow {
  key: string;
  label: string;
  executions: number;
  success: number;
  failed: number;
  credits: number;
  estimatedCost: number;
  avgCostPerExecution: number;
}

interface Totals {
  executions: number;
  success: number;
  successRate: number;
  credits: number;
  estimatedCost: number;
  avgCostPerExecution: number;
  uniqueUsers: number;
}

interface RawRow {
  id: string;
  tool: string;
  user: string;
  provider: string;
  aiModel: string;
  status: string;
  credits: number;
  estimatedCost: number;
  durationMs: number;
  errorType: string | null;
  createdAt: string;
}

function UsageContent() {
  const searchParams = useSearchParams();
  const [range, setRange] = useState<RangeValue>({ range: "30d" });
  const [groupBy, setGroupBy] = useState<GroupBy>("tool");
  const [rows, setRows] = useState<GroupedRow[]>([]);
  const [totals, setTotals] = useState<Totals | null>(null);
  const [rawRows, setRawRows] = useState<RawRow[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [rawTotal, setRawTotal] = useState(0);
  const [showLog, setShowLog] = useState(false);
  const [loading, setLoading] = useState(true);
  const [logLoading, setLogLoading] = useState(false);
  const [error, setError] = useState("");
  const [toolId, setToolId] = useState("");

  const rangeParams = useMemo(() => {
    const p = new URLSearchParams({ range: range.range });
    if (range.start) p.set("start", range.start);
    if (range.end) p.set("end", range.end);
    return p;
  }, [range]);

  useEffect(() => {
    const tid = searchParams.get("toolId");
    if (tid) setToolId(tid);
  }, [searchParams]);

  const fetchGrouped = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams(rangeParams);
      params.set("groupBy", groupBy);
      if (toolId) params.set("toolId", toolId);
      const res = await fetch(`/api/ai-tools/usage?${params}`);
      const body = await res.json().catch(() => ({}));
      if (res.status === 401) {
        window.location.href = "/login?callbackUrl=/dashboard/ai-tools/usage";
        return;
      }
      if (!res.ok) {
        setError(body.error || "Failed to load usage data.");
        return;
      }
      setRows(body.data.rows);
      setTotals(body.data.totals);
    } catch {
      setError("Failed to load usage data. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [rangeParams, groupBy, toolId]);

  const fetchRaw = useCallback(
    async (p: number) => {
      setLogLoading(true);
      try {
        const params = new URLSearchParams(rangeParams);
        params.set("raw", "true");
        params.set("page", String(p));
        params.set("pageSize", "20");
        if (toolId) params.set("toolId", toolId);
        const res = await fetch(`/api/ai-tools/usage?${params}`);
        const body = await res.json().catch(() => ({}));
        if (res.ok && body.success) {
          setRawRows(body.data.raw);
          setPage(body.data.page);
          setTotalPages(body.data.totalPages);
          setRawTotal(body.data.total);
        }
      } catch {
        // keep previous rows on failure
      } finally {
        setLogLoading(false);
      }
    },
    [rangeParams, toolId]
  );

  useEffect(() => {
    fetchGrouped();
    if (showLog) fetchRaw(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchGrouped]);

  useEffect(() => {
    if (showLog) fetchRaw(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showLog]);

  const topToolCredits = useMemo(() => {
    if (groupBy !== "tool" || rows.length === 0) return "—";
    return rows[0].label;
  }, [groupBy, rows]);

  const chartData = useMemo(
    () => rows.slice(0, 10).map((r) => ({ name: r.label.length > 24 ? `${r.label.slice(0, 22)}…` : r.label, value: r.credits })),
    [rows]
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold">Usage & Credits</h2>
          <p className="text-sm text-muted-foreground">
            Where credits and API costs are spent across tools, users, and providers
          </p>
        </div>
        <DateRangeFilter value={range} onChange={setRange} />
      </div>

      {error && (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="p-4 text-sm text-amber-800">{error}</CardContent>
        </Card>
      )}

      {loading && !totals ? (
        <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-lg" />
          ))}
        </div>
      ) : totals ? (
        <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
          <KpiCard label="Credits used" value={totals.credits} icon={Coins} iconColor="text-amber-500" sublabel="in range" />
          <KpiCard
            label="Top tool by credits"
            value={topToolCredits}
            icon={Activity}
            sublabel={groupBy === "tool" ? `${rows.length} tools with usage` : "switch to Tool view"}
          />
          <KpiCard
            label="Avg cost / execution"
            value={formatPrice(totals.avgCostPerExecution)}
            icon={DollarSign}
            iconColor="text-red-500"
            sublabel={`${totals.executions} executions`}
          />
          <KpiCard
            label="Est. API cost"
            value={formatPrice(totals.estimatedCost)}
            icon={DollarSign}
            iconColor="text-red-500"
            sublabel={`${totals.successRate}% success · ${totals.uniqueUsers} users`}
          />
        </div>
      ) : null}

      <Tabs value={groupBy} onValueChange={(v) => setGroupBy(v as GroupBy)}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <TabsList>
            <TabsTrigger value="tool">By tool</TabsTrigger>
            <TabsTrigger value="user">By user</TabsTrigger>
            <TabsTrigger value="provider">By provider</TabsTrigger>
            <TabsTrigger value="date">By date</TabsTrigger>
          </TabsList>
          <Button variant={showLog ? "default" : "outline"} size="sm" onClick={() => setShowLog((s) => !s)}>
            <FileText className="mr-1.5 h-4 w-4" />
            {showLog ? "Hide execution log" : "Execution log"}
          </Button>
        </div>

        {(["tool", "user", "provider", "date"] as GroupBy[]).map((g) => (
          <TabsContent key={g} value={g} className="space-y-4">
            {loading ? (
              <Skeleton className="h-64 w-full rounded-lg" />
            ) : rows.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center text-sm text-muted-foreground">
                  No usage recorded in this range.
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 lg:grid-cols-3">
                <Card className="lg:col-span-2">
                  <CardHeader>
                    <CardTitle className="text-base">Credits by {g}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>{g === "date" ? "Date" : g === "tool" ? "Tool" : g === "user" ? "User" : "Provider"}</TableHead>
                          <TableHead className="text-right">Executions</TableHead>
                          <TableHead className="text-right">Credits</TableHead>
                          <TableHead className="text-right">Est. cost</TableHead>
                          <TableHead className="text-right">Avg / exec</TableHead>
                          <TableHead className="text-right">Success</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {rows.map((r) => (
                          <TableRow key={r.key}>
                            <TableCell className="font-medium">{r.label}</TableCell>
                            <TableCell className="text-right tabular-nums">{r.executions}</TableCell>
                            <TableCell className="text-right tabular-nums">{r.credits}</TableCell>
                            <TableCell className="text-right tabular-nums">{formatPrice(r.estimatedCost)}</TableCell>
                            <TableCell className="text-right tabular-nums">{formatPrice(r.avgCostPerExecution)}</TableCell>
                            <TableCell className="text-right tabular-nums">
                              {r.executions > 0 ? Math.round((r.success / r.executions) * 100) : 0}%
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Credits share</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <RankBar data={chartData} color="#f59e0b" />
                  </CardContent>
                </Card>
              </div>
            )}
          </TabsContent>
        ))}
      </Tabs>

      {showLog && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">
              Execution log <span className="text-sm font-normal text-muted-foreground">({rawTotal} rows)</span>
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" disabled={page <= 1 || logLoading} onClick={() => fetchRaw(page - 1)}>
                Prev
              </Button>
              <span className="text-xs text-muted-foreground tabular-nums">
                {page} / {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages || logLoading}
                onClick={() => fetchRaw(page + 1)}
              >
                Next
              </Button>
              <Button variant="ghost" size="sm" disabled={logLoading} onClick={() => fetchRaw(page)}>
                <RefreshCw className={`h-4 w-4 ${logLoading ? "animate-spin" : ""}`} />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {logLoading && rawRows.length === 0 ? (
              <Skeleton className="h-48 w-full" />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Time</TableHead>
                    <TableHead>Tool</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Provider</TableHead>
                    <TableHead>Model</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Credits</TableHead>
                    <TableHead className="text-right">Cost</TableHead>
                    <TableHead className="text-right">Duration</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rawRows.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="py-8 text-center text-sm text-muted-foreground">
                        No executions in this range.
                      </TableCell>
                    </TableRow>
                  ) : (
                    rawRows.map((r) => (
                      <TableRow key={r.id}>
                        <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                          {formatDateTime(r.createdAt)}
                        </TableCell>
                        <TableCell className="font-medium">{r.tool}</TableCell>
                        <TableCell>{r.user}</TableCell>
                        <TableCell>{r.provider}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{r.aiModel}</TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={`text-[10px] ${
                              r.status === "success"
                                ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                                : r.status === "failed" || r.status === "timeout"
                                  ? "border-red-200 bg-red-50 text-red-700"
                                  : ""
                            }`}
                          >
                            {r.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right tabular-nums">{r.credits}</TableCell>
                        <TableCell className="text-right tabular-nums">{formatPrice(r.estimatedCost)}</TableCell>
                        <TableCell className="text-right tabular-nums">{r.durationMs}ms</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}

      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Users className="h-3.5 w-3.5" />
        Execution rows are kept for 180 days (TTL); aggregates in the tables above remain for the full range.
      </div>
    </div>
  );
}

export default function AiToolsUsagePage() {
  return (
    <Suspense fallback={<Skeleton className="h-64 w-full" />}>
      <UsageContent />
    </Suspense>
  );
}
