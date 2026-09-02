"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Scan, RefreshCw, Play, AlertTriangle, CheckCircle2, XCircle,
  Clock, Shield, Zap, TrendingUp, Search, Loader2, Eye,
  Bot, FolderKanban, AlertCircle, Calendar, BarChart3, Bell,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";

interface ScanFinding {
  category: string;
  severity: string;
  title: string;
  description: string;
  actionRequired: boolean;
}

interface ScanRecommendation {
  priority: string;
  category: string;
  title: string;
  description: string;
  action: string;
  impact: string;
}

interface ScanResult {
  timestamp: string;
  duration: number;
  scanType: string;
  findings: ScanFinding[];
  recommendations: ScanRecommendation[];
  stats: {
    agentsScanned: number;
    projectsScanned: number;
    tasksScanned: number;
    findingsCount: number;
    changesCount: number;
    recommendationsCount: number;
    alertsGenerated: number;
  };
}

interface ScanHistory {
  _id: string;
  createdAt: string;
  details: any;
}

const SEVERITY_COLORS: Record<string, string> = {
  critical: "bg-red-100 text-red-700",
  high: "bg-orange-100 text-orange-700",
  warning: "bg-amber-100 text-amber-700",
  info: "bg-blue-100 text-blue-700",
};

const PRIORITY_COLORS: Record<string, string> = {
  urgent: "bg-red-100 text-red-700",
  high: "bg-orange-100 text-orange-700",
  medium: "bg-amber-100 text-amber-700",
  low: "bg-blue-100 text-blue-700",
};

export default function ScannerPage() {
  const [lastScan, setLastScan] = useState<ScanResult | null>(null);
  const [history, setHistory] = useState<ScanHistory[]>([]);
  const [scanning, setScanning] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("findings");

  const fetchHistory = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/pm/scanner?action=history", { credentials: "include" });
      const data = await res.json();
      if (data.history) setHistory(data.history);
    } catch (err) {
      console.error("Failed to fetch scan history:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchHistory(); }, [fetchHistory]);

  const runScan = async (type: "full-scan" | "quick-scan") => {
    setScanning(true);
    try {
      const res = await fetch("/api/pm/scanner", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: type }),
        credentials: "include",
      });
      const data = await res.json();
      if (data.result) setLastScan(data.result);
      await fetchHistory();
    } finally {
      setScanning(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Scan className="h-6 w-6 text-blue-600" />
            System Scanner
          </h1>
          <p className="text-sm text-muted-foreground">Automated intelligence gathering and change detection</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={fetchHistory} disabled={loading || scanning}>
            <RefreshCw className={cn("h-4 w-4 mr-1", loading && "animate-spin")} />
            History
          </Button>
          <Button variant="outline" size="sm" onClick={() => runScan("quick-scan")} disabled={scanning}>
            {scanning ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Zap className="h-4 w-4 mr-1" />}
            Quick Scan
          </Button>
          <Button size="sm" onClick={() => runScan("full-scan")} disabled={scanning}>
            {scanning ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Play className="h-4 w-4 mr-1" />}
            Full Scan
          </Button>
        </div>
      </div>

      {/* Last Scan Results */}
      {lastScan && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center justify-between">
              <span>Last Scan Results</span>
              <Badge variant="outline">{lastScan.scanType} — {lastScan.duration}ms</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
              {[
                { label: "Agents Scanned", value: lastScan.stats.agentsScanned, icon: <Bot className="h-4 w-4" /> },
                { label: "Projects Scanned", value: lastScan.stats.projectsScanned, icon: <FolderKanban className="h-4 w-4" /> },
                { label: "Findings", value: lastScan.stats.findingsCount, icon: <AlertTriangle className="h-4 w-4" /> },
                { label: "Alerts Generated", value: lastScan.stats.alertsGenerated, icon: <Bell className="h-4 w-4" /> },
              ].map((s) => (
                <div key={s.label} className="flex items-center gap-2 p-2 rounded-lg bg-muted/50">
                  <div className="text-muted-foreground">{s.icon}</div>
                  <div>
                    <p className="text-lg font-bold">{s.value}</p>
                    <p className="text-[10px] text-muted-foreground">{s.label}</p>
                  </div>
                </div>
              ))}
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList>
                <TabsTrigger value="findings">Findings ({lastScan.findings.length})</TabsTrigger>
                <TabsTrigger value="recommendations">Recommendations ({lastScan.recommendations.length})</TabsTrigger>
              </TabsList>

              <TabsContent value="findings" className="space-y-2 max-h-80 overflow-y-auto">
                {lastScan.findings.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">No findings — system is healthy</p>
                ) : (
                  lastScan.findings.map((f, i) => (
                    <div key={i} className="flex items-start gap-3 p-3 rounded-lg border">
                      {f.severity === "critical" ? <XCircle className="h-4 w-4 text-red-600 mt-0.5" /> :
                       f.severity === "high" ? <AlertTriangle className="h-4 w-4 text-orange-600 mt-0.5" /> :
                       f.severity === "warning" ? <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5" /> :
                       <CheckCircle2 className="h-4 w-4 text-blue-600 mt-0.5" />}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium">{f.title}</p>
                          <Badge className={cn("text-[10px]", SEVERITY_COLORS[f.severity])}>{f.severity}</Badge>
                          <Badge variant="outline" className="text-[10px]">{f.category}</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">{f.description}</p>
                      </div>
                    </div>
                  ))
                )}
              </TabsContent>

              <TabsContent value="recommendations" className="space-y-2 max-h-80 overflow-y-auto">
                {lastScan.recommendations.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">No recommendations</p>
                ) : (
                  lastScan.recommendations.map((r, i) => (
                    <div key={i} className="p-3 rounded-lg border">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium">{r.title}</p>
                        <Badge className={cn("text-[10px]", PRIORITY_COLORS[r.priority])}>{r.priority}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">{r.description}</p>
                      <div className="flex gap-4 mt-2 text-xs">
                        <span className="text-muted-foreground">Action: <strong>{r.action}</strong></span>
                        <span className="text-muted-foreground">Impact: <strong>{r.impact}</strong></span>
                      </div>
                    </div>
                  ))
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}

      {/* Scan History */}
      <Card>
        <CardHeader><CardTitle className="text-base">Scan History</CardTitle></CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
          ) : history.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No scans performed yet. Run a scan to get started.</p>
          ) : (
            <div className="space-y-2">
              {history.map((h) => (
                <div key={h._id} className="flex items-center justify-between p-2 rounded-lg border text-sm">
                  <div className="flex items-center gap-3">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span className="font-mono text-xs">{new Date(h.createdAt).toLocaleString()}</span>
                    <Badge variant="outline" className="text-[10px]">{h.details?.scanType || "unknown"}</Badge>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span>{h.details?.duration || 0}ms</span>
                    <span>{h.details?.findingsCount || 0} findings</span>
                    <span>{h.details?.alertsGenerated || 0} alerts</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
