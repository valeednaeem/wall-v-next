"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Activity, Search, Loader2, CheckCircle2, XCircle, Clock, Pause,
  AlertTriangle, Zap, DollarSign, ChevronDown, ChevronUp, RotateCcw
} from "lucide-react";
import { cn } from "@/lib/utils";

interface ExecutionStats {
  count: number;
  totalCost: number;
  totalTokens: number;
  avgDuration: number;
}

interface Execution {
  _id: string;
  agent: { _id: string; name: string; slug: string; role: string; division?: string };
  conversation?: { channel: string };
  type: string;
  status: string;
  input: { message?: string; toolName?: string; parameters?: Record<string, unknown> };
  output?: { response?: string; error?: string };
  tokens: { prompt: number; completion: number; total: number };
  cost: number;
  duration: number;
  retryCount: number;
  error?: { message: string; code?: string };
  startedAt: string;
  completedAt?: string;
}

const STATUS_ICONS: Record<string, typeof Activity> = {
  pending: Clock, running: RotateCcw, completed: CheckCircle2, failed: XCircle, timeout: AlertTriangle, cancelled: Pause,
};
const STATUS_COLORS: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-700",
  running: "bg-blue-100 text-blue-700",
  completed: "bg-green-100 text-green-700",
  failed: "bg-red-100 text-red-700",
  timeout: "bg-orange-100 text-orange-700",
  cancelled: "bg-gray-100 text-gray-600",
};

export default function ExecutionsPage() {
  const [executions, setExecutions] = useState<Execution[]>([]);
  const [stats, setStats] = useState<Record<string, ExecutionStats>>({});
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filterStatus, setFilterStatus] = useState("");
  const [filterType, setFilterType] = useState("");
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const fetchExecutions = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: page.toString(), limit: "50" });
      if (filterStatus) params.set("status", filterStatus);
      if (filterType) params.set("type", filterType);
      const res = await fetch(`/api/agents/executions?${params}`, { credentials: "include" });
      const data = await res.json();
      setExecutions(data.executions || []);
      setStats(data.stats || {});
      setTotal(data.total || 0);
      setTotalPages(data.totalPages || 1);
    } catch { console.error("Failed to fetch executions"); } finally { setLoading(false); }
  }, [page, filterStatus, filterType]);

  useEffect(() => { fetchExecutions(); }, [fetchExecutions]);

  const filtered = executions.filter((e) => {
    if (search && !e.agent?.name?.toLowerCase().includes(search.toLowerCase()) && !(e.input?.message || "").toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const totalCost = Object.values(stats).reduce((sum, s) => sum + (s.totalCost || 0), 0);
  const totalTokens = Object.values(stats).reduce((sum, s) => sum + (s.totalTokens || 0), 0);
  const completedCount = stats.completed?.count || 0;
  const failedCount = stats.failed?.count || 0;
  const successRate = completedCount + failedCount > 0 ? Math.round((completedCount / (completedCount + failedCount)) * 100) : 100;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Executions</h1>
          <p className="text-sm text-muted-foreground">Agent execution history and monitoring</p>
        </div>
        <div className="text-right text-sm text-muted-foreground">{total} total executions</div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { label: "Pending", value: stats.pending?.count || 0, icon: Clock, color: "text-yellow-600" },
          { label: "Running", value: stats.running?.count || 0, icon: RotateCcw, color: "text-blue-600" },
          { label: "Completed", value: completedCount, icon: CheckCircle2, color: "text-green-600" },
          { label: "Failed", value: failedCount, icon: XCircle, color: "text-red-600" },
          { label: "Success Rate", value: `${successRate}%`, icon: Zap, color: "text-primary" },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-xl border p-3">
            <div className="flex items-center gap-2">
              <s.icon className={cn("h-4 w-4", s.color)} />
              <div><p className="text-xs text-muted-foreground">{s.label}</p><p className="text-lg font-bold">{s.value}</p></div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white rounded-xl border p-3">
          <div className="flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-green-600" />
            <div><p className="text-xs text-muted-foreground">Total Cost</p><p className="text-lg font-bold">${totalCost.toFixed(4)}</p></div>
          </div>
        </div>
        <div className="bg-white rounded-xl border p-3">
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-blue-600" />
            <div><p className="text-xs text-muted-foreground">Total Tokens</p><p className="text-lg font-bold">{totalTokens.toLocaleString()}</p></div>
          </div>
        </div>
        <div className="bg-white rounded-xl border p-3">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-orange-600" />
            <div><p className="text-xs text-muted-foreground">Avg Duration</p><p className="text-lg font-bold">{stats.completed?.avgDuration ? `${Math.round(stats.completed.avgDuration)}ms` : "N/A"}</p></div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input type="text" placeholder="Search executions..." value={search} onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border bg-muted/50 pl-9 pr-4 py-2 text-sm" />
        </div>
        <select value={filterStatus} onChange={(e) => { setFilterStatus(e.target.value); setPage(1); }}
          className="rounded-lg border bg-background px-3 py-2 text-sm">
          <option value="">All Status</option>
          {["pending", "running", "completed", "failed", "timeout", "cancelled"].map((s) => (
            <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
          ))}
        </select>
        <select value={filterType} onChange={(e) => { setFilterType(e.target.value); setPage(1); }}
          className="rounded-lg border bg-background px-3 py-2 text-sm">
          <option value="">All Types</option>
          {["chat", "tool-call", "hook-trigger", "skill-invoke", "batch", "scheduled"].map((t) => (
            <option key={t} value={t}>{t.replace("-", " ")}</option>
          ))}
        </select>
      </div>

      {/* Executions List */}
      {loading ? (
        <div className="flex items-center justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border">
          <Activity className="h-12 w-12 text-muted-foreground mx-auto mb-3 opacity-50" />
          <p className="text-muted-foreground">No executions found</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border overflow-hidden">
          <table className="w-full text-sm">
            <thead><tr className="border-b bg-muted/30">
              <th className="text-left p-3 font-medium text-muted-foreground">Status</th>
              <th className="text-left p-3 font-medium text-muted-foreground">Agent</th>
              <th className="text-left p-3 font-medium text-muted-foreground">Type</th>
              <th className="text-left p-3 font-medium text-muted-foreground">Input</th>
              <th className="text-right p-3 font-medium text-muted-foreground">Tokens</th>
              <th className="text-right p-3 font-medium text-muted-foreground">Cost</th>
              <th className="text-right p-3 font-medium text-muted-foreground">Duration</th>
              <th className="text-left p-3 font-medium text-muted-foreground">Time</th>
              <th className="w-8 p-3"></th>
            </tr></thead>
            <tbody>
              {filtered.map((ex) => {
                const Icon = STATUS_ICONS[ex.status] || Activity;
                const isExpanded = expandedId === ex._id;
                return (
                  <>
                    <tr key={ex._id} className="border-b hover:bg-muted/30 cursor-pointer" onClick={() => setExpandedId(isExpanded ? null : ex._id)}>
                      <td className="p-3"><span className={cn("inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded", STATUS_COLORS[ex.status])}><Icon className="h-3 w-3" />{ex.status}</span></td>
                      <td className="p-3"><div><p className="font-medium text-xs">{ex.agent?.name || "Unknown"}</p>{ex.agent?.division && <p className="text-xs text-muted-foreground">{ex.agent.division}</p>}</div></td>
                      <td className="p-3 text-xs">{ex.type}</td>
                      <td className="p-3 text-xs max-w-[200px] truncate">{ex.input?.message || ex.input?.toolName || "-"}</td>
                      <td className="p-3 text-xs text-right">{ex.tokens?.total?.toLocaleString() || 0}</td>
                      <td className="p-3 text-xs text-right">${(ex.cost || 0).toFixed(4)}</td>
                      <td className="p-3 text-xs text-right">{ex.duration ? `${ex.duration}ms` : "-"}</td>
                      <td className="p-3 text-xs text-muted-foreground">{new Date(ex.startedAt).toLocaleString()}</td>
                      <td className="p-3">{isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}</td>
                    </tr>
                    {isExpanded && (
                      <tr key={`${ex._id}-detail`}>
                        <td colSpan={9} className="p-4 bg-muted/20">
                          <div className="grid grid-cols-2 gap-4 text-xs">
                            <div>
                              <p className="font-medium text-muted-foreground mb-1">Input</p>
                              <pre className="bg-white rounded-lg p-2 overflow-auto max-h-32 border">{JSON.stringify(ex.input?.parameters || ex.input?.message, null, 2)}</pre>
                            </div>
                            <div>
                              <p className="font-medium text-muted-foreground mb-1">Output</p>
                              <pre className="bg-white rounded-lg p-2 overflow-auto max-h-32 border">{ex.output?.response || ex.output?.error || "No output"}</pre>
                            </div>
                            {ex.error && (
                              <div className="col-span-2">
                                <p className="font-medium text-red-600 mb-1">Error</p>
                                <p className="text-red-700">{ex.error.message}</p>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                );
              })}
            </tbody>
          </table>
          {/* Pagination */}
          <div className="flex items-center justify-between p-3 border-t">
            <span className="text-xs text-muted-foreground">Page {page} of {totalPages}</span>
            <div className="flex gap-2">
              <button disabled={page <= 1} onClick={() => setPage(page - 1)} className="px-3 py-1 text-xs border rounded-lg hover:bg-muted disabled:opacity-50">Previous</button>
              <button disabled={page >= totalPages} onClick={() => setPage(page + 1)} className="px-3 py-1 text-xs border rounded-lg hover:bg-muted disabled:opacity-50">Next</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
