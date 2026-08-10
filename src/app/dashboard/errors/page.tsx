"use client";

import { useState, useEffect, useCallback } from "react";
import { RefreshCw, Search, Filter, CheckCircle, AlertTriangle, XCircle, Info, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface ErrorLogEntry {
  _id: string;
  message: string;
  stack?: string;
  level: string;
  source?: string;
  userId?: string;
  metadata?: Record<string, unknown>;
  userAgent?: string;
  resolved: boolean;
  createdAt: string;
}

interface LogStats {
  errorCount: number;
  warningCount: number;
  infoCount: number;
  criticalCount: number;
}

const LEVEL_ICONS: Record<string, typeof Info> = {
  info: Info,
  warning: AlertTriangle,
  error: XCircle,
  critical: AlertTriangle,
};

const LEVEL_COLORS: Record<string, string> = {
  info: "bg-blue-100 text-blue-700",
  warning: "bg-yellow-100 text-yellow-700",
  error: "bg-red-100 text-red-700",
  critical: "bg-red-200 text-red-900",
};

export default function ErrorsPage() {
  const [logs, setLogs] = useState<ErrorLogEntry[]>([]);
  const [stats, setStats] = useState<LogStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [levelFilter, setLevelFilter] = useState("");
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (levelFilter) params.set("level", levelFilter);
      if (search) params.set("search", search);
      params.set("limit", "100");

      const res = await fetch(`/api/admin/error-logs?${params}`);
      const data = await res.json();
      if (data.success) {
        setLogs(data.data);
        setStats(data.stats);
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, [levelFilter, search]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const handleResolve = async (id: string, resolved: boolean) => {
    await fetch("/api/admin/error-logs", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, resolved }),
    });
    fetchLogs();
  };

  const handleDelete = async (id: string) => {
    await fetch(`/api/admin/error-logs?id=${id}`, { method: "DELETE" });
    fetchLogs();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Error Logs</h2>
        <button onClick={fetchLogs} className="flex items-center gap-2 text-sm border rounded-lg px-3 py-2 hover:bg-accent">
          <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
          Refresh
        </button>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid gap-4 md:grid-cols-4">
          {[
            { label: "Errors", value: stats.errorCount, icon: XCircle, color: "text-red-500" },
            { label: "Warnings", value: stats.warningCount, icon: AlertTriangle, color: "text-yellow-500" },
            { label: "Info", value: stats.infoCount, icon: Info, color: "text-blue-500" },
            { label: "Critical", value: stats.criticalCount, icon: AlertTriangle, color: "text-red-700" },
          ].map((stat) => (
            <div key={stat.label} className="rounded-lg border p-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">{stat.label}</p>
                <stat.icon className={cn("h-5 w-5", stat.color)} />
              </div>
              <p className="text-2xl font-bold mt-1">{stat.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search logs..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border pl-9 pr-3 py-2 text-sm"
          />
        </div>
        <select
          value={levelFilter}
          onChange={(e) => setLevelFilter(e.target.value)}
          className="rounded-lg border px-3 py-2 text-sm"
        >
          <option value="">All Levels</option>
          <option value="error">Error</option>
          <option value="warning">Warning</option>
          <option value="info">Info</option>
          <option value="critical">Critical</option>
        </select>
      </div>

      {/* Logs Table */}
      <div className="rounded-lg border overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-sm text-muted-foreground">Loading...</div>
        ) : logs.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">No error logs found.</div>
        ) : (
          <div className="divide-y">
            {logs.map((log) => {
              const Icon = LEVEL_ICONS[log.level] || Info;
              return (
                <div key={log._id} className="p-4 hover:bg-accent/50">
                  <div className="flex items-start gap-3">
                    <Icon className={cn("h-5 w-5 mt-0.5 shrink-0", LEVEL_COLORS[log.level])} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium", LEVEL_COLORS[log.level])}>
                          {log.level}
                        </span>
                        {log.source && (
                          <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">
                            {log.source}
                          </span>
                        )}
                        {log.resolved && (
                          <span className="text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded flex items-center gap-1">
                            <CheckCircle className="h-3 w-3" /> Resolved
                          </span>
                        )}
                      </div>
                      <p className="text-sm font-medium">{log.message}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {new Date(log.createdAt).toLocaleString()}
                      </p>
                      {expandedId === log._id && log.stack && (
                        <pre className="mt-2 text-xs bg-muted p-3 rounded overflow-x-auto whitespace-pre-wrap">
                          {log.stack}
                        </pre>
                      )}
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {log.stack && (
                        <button
                          onClick={() => setExpandedId(expandedId === log._id ? null : log._id)}
                          className="text-xs text-muted-foreground hover:text-foreground px-2 py-1 rounded hover:bg-muted"
                        >
                          {expandedId === log._id ? "Hide" : "Stack"}
                        </button>
                      )}
                      <button
                        onClick={() => handleResolve(log._id, !log.resolved)}
                        className="text-xs text-muted-foreground hover:text-green-600 px-2 py-1 rounded hover:bg-muted"
                      >
                        {log.resolved ? "Unresolve" : "Resolve"}
                      </button>
                      <button
                        onClick={() => handleDelete(log._id)}
                        className="text-xs text-muted-foreground hover:text-red-600 px-2 py-1 rounded hover:bg-muted"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
