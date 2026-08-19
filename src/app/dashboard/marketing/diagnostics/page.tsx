"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { Loader2, RefreshCw, CheckCircle2, AlertCircle, XCircle, Wifi, Database, Globe, Shield, Zap, Cpu, HardDrive, AlertTriangle, Info, Search, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";

interface DiagnosticCheck {
  id: string;
  name: string;
  category: "google" | "seo" | "tracking" | "performance" | "security" | "content";
  status: "pass" | "warning" | "fail" | "unknown";
  message: string;
  details?: string;
  fixUrl?: string;
  fixLabel?: string;
  lastChecked: string;
}

interface DiagnosticSummary {
  total: number;
  passed: number;
  warnings: number;
  failed: number;
  unknown: number;
  score: number;
}

export default function DiagnosticsPage() {
  const { data: session, status } = useSession();
  const [checks, setChecks] = useState<DiagnosticCheck[]>([]);
  const [summary, setSummary] = useState<DiagnosticSummary>({
    total: 0,
    passed: 0,
    warnings: 0,
    failed: 0,
    unknown: 0,
    score: 0,
  });
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [filter, setFilter] = useState<"all" | "pass" | "warning" | "fail" | "unknown">("all");
  const [categoryFilter, setCategoryFilter] = useState<"all" | "google" | "seo" | "tracking" | "performance" | "security" | "content">("all");

  useEffect(() => {
    if (status === "loading") return;
    if (status === "unauthenticated") {
      window.location.href = "/login?callbackUrl=/dashboard/marketing/diagnostics";
      return;
    }
    runDiagnostics();
  }, [status]);

  const runDiagnostics = async () => {
    setLoading(true);
    setRunning(true);
    try {
      const res = await fetch("/api/marketing/diagnostics", { method: "POST" });
      const data = await res.json();
      if (data.success) {
        setChecks(data.data.checks);
        setSummary(data.data.summary);
      }
    } catch (error) {
      console.error("Diagnostics failed:", error);
    } finally {
      setLoading(false);
      setRunning(false);
    }
  };

  const getStatusIcon = (status: DiagnosticCheck["status"]) => {
    switch (status) {
      case "pass": return <CheckCircle2 className="h-5 w-5 text-green-500" />;
      case "warning": return <AlertTriangle className="h-5 w-5 text-amber-500" />;
      case "fail": return <XCircle className="h-5 w-5 text-red-500" />;
      default: return <Info className="h-5 w-5 text-gray-400" />;
    }
  };

  const getStatusBadge = (status: DiagnosticCheck["status"]) => {
    const styles = {
      pass: "bg-green-100 text-green-700",
      warning: "bg-amber-100 text-amber-700",
      fail: "bg-red-100 text-red-700",
      unknown: "bg-gray-100 text-gray-700",
    };
    return <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${styles[status]}`}>{status.charAt(0).toUpperCase() + status.slice(1)}</span>;
  };

  const getCategoryIcon = (category: DiagnosticCheck["category"]) => {
    const icons: Record<DiagnosticCheck["category"], React.ComponentType<{ className?: string }>> = {
      google: Globe,
      seo: Search,
      tracking: Zap,
      performance: Cpu,
      security: Shield,
      content: Database,
    };
    const Icon = icons[category];
    return <Icon className="h-4 w-4" />;
  };

  const filteredChecks = checks.filter((check) => {
    if (filter !== "all" && check.status !== filter) return false;
    if (categoryFilter !== "all" && check.category !== categoryFilter) return false;
    return true;
  });

  if (status === "loading") {
    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold">Marketing Diagnostics</h2>
        <div className="rounded-lg border p-6 animate-pulse space-y-4">
          <div className="h-4 bg-muted rounded w-1/4" />
          <div className="h-4 bg-muted rounded w-1/2" />
        </div>
      </div>
    );
  }

  if (!session) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Cpu className="h-6 w-6 text-primary" />
            Marketing Diagnostics
          </h2>
          <p className="text-sm text-muted-foreground mt-1">Comprehensive health checks for Google services, SEO, tracking, performance, and security</p>
        </div>
        <button onClick={runDiagnostics} disabled={running} className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50">
          {running ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          {running ? "Running..." : "Run Diagnostics"}
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-5">
        {[
          { label: "Health Score", value: `${summary.score}%`, icon: CheckCircle2, color: summary.score >= 80 ? "text-green-500" : summary.score >= 60 ? "text-amber-500" : "text-red-500", bg: summary.score >= 80 ? "bg-green-50" : summary.score >= 60 ? "bg-amber-50" : "bg-red-50" },
          { label: "Passed", value: summary.passed, icon: CheckCircle2, color: "text-green-500", bg: "bg-green-50" },
          { label: "Warnings", value: summary.warnings, icon: AlertTriangle, color: "text-amber-500", bg: "bg-amber-50" },
          { label: "Failed", value: summary.failed, icon: XCircle, color: "text-red-500", bg: "bg-red-50" },
          { label: "Total Checks", value: summary.total, icon: Database, color: "text-blue-500", bg: "bg-blue-50" },
        ].map((stat) => (
          <div key={stat.label} className="rounded-lg border p-6">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">{stat.label}</p>
              <stat.icon className={cn("h-5 w-5", stat.color)} />
            </div>
            <p className="mt-2 text-3xl font-bold">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="flex gap-2 flex-wrap">
          {["all", "pass", "warning", "fail", "unknown"].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn("px-3 py-1.5 rounded-full text-sm font-medium transition-colors",
                filter === f ? "bg-primary text-primary-foreground" : "border hover:bg-accent"
              )}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
        <div className="flex gap-2 flex-wrap ml-auto">
          {["all", "google", "seo", "tracking", "performance", "security", "content"].map((c) => (
            <button
              key={c}
              onClick={() => setCategoryFilter(c)}
              className={cn("px-3 py-1.5 rounded-full text-sm font-medium transition-colors",
                categoryFilter === c ? "bg-primary text-primary-foreground" : "border hover:bg-accent"
              )}
            >
              {c.charAt(0).toUpperCase() + c.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Checks Table */}
      <div className="rounded-lg border overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-sm text-muted-foreground">Running diagnostics...</div>
        ) : filteredChecks.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">No checks match current filters</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Check</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Category</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Status</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Message</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Details</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Actions</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Last Checked</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredChecks.map((check) => (
                  <tr key={check.id} className="hover:bg-accent/50">
                    <td className="px-4 py-3">
                      <div className="font-medium text-sm">{check.name}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium bg-muted">
                        {getCategoryIcon(check.category)}
                        {check.category}
                      </span>
                    </td>
                    <td className="px-4 py-3">{getStatusBadge(check.status)}</td>
                    <td className="px-4 py-3 text-sm max-w-md truncate">{check.message}</td>
                    <td className="px-4 py-3 text-sm text-muted-foreground max-w-md truncate">{check.details || "—"}</td>
                    <td className="px-4 py-3">
                      {check.fixUrl && (
                        <a
                          href={check.fixUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs px-2 py-1 border rounded hover:bg-accent text-primary"
                        >
                          <ExternalLink className="h-3 w-3" />
                          {check.fixLabel || "Fix"}
                        </a>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {new Date(check.lastChecked).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Category Breakdown */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {["google", "seo", "tracking", "performance", "security", "content"].map((cat) => {
          const catChecks = checks.filter((c) => c.category === cat);
          const catPassed = catChecks.filter((c) => c.status === "pass").length;
          const catTotal = catChecks.length;
          const catScore = catTotal > 0 ? Math.round((catPassed / catTotal) * 100) : 0;
          return (
            <div key={cat} className="rounded-lg border p-6">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-medium capitalize">{cat}</h4>
                <span className="text-2xl font-bold">{catScore}%</span>
              </div>
              <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-red-500 via-amber-500 to-green-500"
                  style={{ width: `${catScore}%` }}
                />
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                {catPassed}/{catTotal} passed
              </p>
            </div>
          );
        })}
      </div>

      {/* Quick Actions */}
      <div className="rounded-lg border p-6 bg-blue-50 border-blue-200">
        <h3 className="font-semibold text-blue-900 mb-4 flex items-center gap-2">
          <Zap className="h-5 w-5" />
          Quick Actions
        </h3>
        <div className="grid gap-3 md:grid-cols-3">
          <a href="/dashboard/marketing/seo" className="p-4 rounded-lg bg-white border hover:border-primary/50 transition-colors">
            <h4 className="font-medium">Fix SEO Issues</h4>
            <p className="text-sm text-muted-foreground mt-1">Manage meta tags, sitemaps, robots.txt, and structured data</p>
          </a>
          <a href="/dashboard/marketing/google" className="p-4 rounded-lg bg-white border hover:border-primary/50 transition-colors">
            <h4 className="font-medium">Configure Google Services</h4>
            <p className="text-sm text-muted-foreground mt-1">Connect Analytics, Search Console, Merchant Center, and Ads</p>
          </a>
          <a href="/dashboard/marketing/tracking/events" className="p-4 rounded-lg bg-white border hover:border-primary/50 transition-colors">
            <h4 className="font-medium">Set Up Event Tracking</h4>
            <p className="text-sm text-muted-foreground mt-1">Define GA4 events, conversion mapping, and data layer</p>
          </a>
        </div>
      </div>
    </div>
  );
}