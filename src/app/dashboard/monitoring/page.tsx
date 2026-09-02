"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Activity, RefreshCw, AlertTriangle, CheckCircle2, XCircle,
  Clock, Shield, Zap, TrendingUp, Bell, Play, Loader2,
  Bot, FolderKanban, AlertCircle, Calendar, BarChart3,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";

interface HealthCheck {
  name: string;
  status: "pass" | "warn" | "fail";
  message: string;
  value?: number;
  threshold?: number;
  category: string;
}

interface SystemHealth {
  timestamp: string;
  overall: string;
  score: number;
  agents: { total: number; healthy: number; degraded: number; unhealthy: number; offline: number };
  projects: { total: number; onTrack: number; atRisk: number; overdue: number; blocked: number };
  alerts: { total: number; critical: number; high: number; warning: number; info: number; unresolved: number };
  risks: { total: number; critical: number; high: number; unmitigated: number };
  issues: { total: number; critical: number; open: number };
  capacity: { overloadedAgents: string[]; overloadedHumans: string[]; totalOverloaded: number };
  deadlines: { overdueTasks: number; tasksDueToday: number; tasksDueThisWeek: number };
  checks: HealthCheck[];
}

interface TimelineEntry {
  date: string;
  critical: number;
  high: number;
  warning: number;
  info: number;
  total: number;
}

const STATUS_ICONS: Record<string, React.ReactNode> = {
  pass: <CheckCircle2 className="h-4 w-4 text-emerald-600" />,
  warn: <AlertTriangle className="h-4 w-4 text-amber-600" />,
  fail: <XCircle className="h-4 w-4 text-red-600" />,
};

const STATUS_COLORS: Record<string, string> = {
  healthy: "bg-emerald-100 text-emerald-700",
  degraded: "bg-amber-100 text-amber-700",
  unhealthy: "bg-red-100 text-red-700",
  critical: "bg-red-100 text-red-700",
};

export default function MonitoringPage() {
  const [health, setHealth] = useState<SystemHealth | null>(null);
  const [timeline, setTimeline] = useState<TimelineEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [runningChecks, setRunningChecks] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [healthRes, timelineRes] = await Promise.all([
        fetch("/api/pm/monitoring?action=health", { credentials: "include" }),
        fetch("/api/pm/monitoring?action=timeline&days=7", { credentials: "include" }),
      ]);
      const [healthData, timelineData] = await Promise.all([healthRes.json(), timelineRes.json()]);
      if (healthData.health) setHealth(healthData.health);
      if (timelineData.timeline) setTimeline(timelineData.timeline);
    } catch (err) {
      console.error("Failed to fetch monitoring data:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const runChecks = async () => {
    setRunningChecks(true);
    try {
      await fetch("/api/pm/monitoring", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "run-checks" }),
        credentials: "include",
      });
      await fetchData();
    } finally {
      setRunningChecks(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Activity className="h-6 w-6 text-blue-600" />
            System Monitor
          </h1>
          <p className="text-sm text-muted-foreground">Real-time health, alerts, and workload monitoring</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={fetchData} disabled={loading}>
            <RefreshCw className={cn("h-4 w-4 mr-1", loading && "animate-spin")} />
            Refresh
          </Button>
          <Button size="sm" onClick={runChecks} disabled={runningChecks}>
            {runningChecks ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Play className="h-4 w-4 mr-1" />}
            Run Checks
          </Button>
        </div>
      </div>

      {/* Overall Status */}
      {loading ? (
        <Card><CardContent className="p-4"><Skeleton className="h-20 w-full" /></CardContent></Card>
      ) : health && (
        <Card className={cn(health.overall === "unhealthy" && "border-red-200", health.overall === "degraded" && "border-amber-200")}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {health.overall === "healthy" ? <CheckCircle2 className="h-8 w-8 text-emerald-600" /> :
                 health.overall === "degraded" ? <AlertTriangle className="h-8 w-8 text-amber-600" /> :
                 <XCircle className="h-8 w-8 text-red-600" />}
                <div>
                  <p className="text-lg font-bold capitalize">{health.overall}</p>
                  <p className="text-xs text-muted-foreground">Overall system health score: {health.score}%</p>
                </div>
              </div>
              <div className="flex gap-6 text-sm">
                <div className="text-center">
                  <p className="text-xl font-bold">{health.agents.total}</p>
                  <p className="text-xs text-muted-foreground">Agents</p>
                </div>
                <div className="text-center">
                  <p className="text-xl font-bold">{health.projects.total}</p>
                  <p className="text-xs text-muted-foreground">Projects</p>
                </div>
                <div className="text-center">
                  <p className="text-xl font-bold">{health.alerts.unresolved}</p>
                  <p className="text-xs text-muted-foreground">Open Alerts</p>
                </div>
                <div className="text-center">
                  <p className="text-xl font-bold">{health.deadlines.overdueTasks}</p>
                  <p className="text-xs text-muted-foreground">Overdue</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">Checks</TabsTrigger>
          <TabsTrigger value="agents">Agents</TabsTrigger>
          <TabsTrigger value="projects">Projects</TabsTrigger>
          <TabsTrigger value="alerts">Alerts & Risks</TabsTrigger>
          <TabsTrigger value="deadlines">Deadlines</TabsTrigger>
          <TabsTrigger value="timeline">Timeline</TabsTrigger>
        </TabsList>

        {/* Health Checks Tab */}
        <TabsContent value="overview" className="space-y-3">
          {loading ? (
            Array.from({ length: 5 }).map((_, i) => <Card key={i}><CardContent className="p-3"><Skeleton className="h-12 w-full" /></CardContent></Card>)
          ) : health?.checks.map((check) => (
            <Card key={check.name}>
              <CardContent className="p-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {STATUS_ICONS[check.status]}
                    <div>
                      <p className="font-medium text-sm">{check.name}</p>
                      <p className="text-xs text-muted-foreground">{check.message}</p>
                    </div>
                  </div>
                  <Badge className={cn("text-[10px]", check.status === "pass" ? "bg-emerald-100 text-emerald-700" : check.status === "warn" ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700")}>
                    {check.status}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        {/* Agents Tab */}
        <TabsContent value="agents">
          {health && (
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              {[
                { label: "Total", value: health.agents.total, icon: <Bot className="h-4 w-4" />, color: "text-blue-600" },
                { label: "Healthy", value: health.agents.healthy, icon: <CheckCircle2 className="h-4 w-4" />, color: "text-emerald-600" },
                { label: "Degraded", value: health.agents.degraded, icon: <AlertTriangle className="h-4 w-4" />, color: "text-amber-600" },
                { label: "Unhealthy", value: health.agents.unhealthy, icon: <XCircle className="h-4 w-4" />, color: "text-red-600" },
                { label: "Offline", value: health.agents.offline, icon: <Clock className="h-4 w-4" />, color: "text-gray-600" },
              ].map((s) => (
                <Card key={s.label}>
                  <CardContent className="p-3 text-center">
                    <div className={cn("mx-auto mb-1", s.color)}>{s.icon}</div>
                    <p className="text-2xl font-bold">{s.value}</p>
                    <p className="text-xs text-muted-foreground">{s.label}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Projects Tab */}
        <TabsContent value="projects">
          {health && (
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              {[
                { label: "Total", value: health.projects.total, icon: <FolderKanban className="h-4 w-4 text-blue-600" /> },
                { label: "On Track", value: health.projects.onTrack, icon: <CheckCircle2 className="h-4 w-4 text-emerald-600" /> },
                { label: "At Risk", value: health.projects.atRisk, icon: <AlertTriangle className="h-4 w-4 text-amber-600" /> },
                { label: "Overdue", value: health.projects.overdue, icon: <XCircle className="h-4 w-4 text-red-600" /> },
                { label: "Blocked", value: health.projects.blocked, icon: <AlertCircle className="h-4 w-4 text-orange-600" /> },
              ].map((s) => (
                <Card key={s.label}>
                  <CardContent className="p-3 text-center">
                    <div className="mx-auto mb-1">{s.icon}</div>
                    <p className="text-2xl font-bold">{s.value}</p>
                    <p className="text-xs text-muted-foreground">{s.label}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Alerts & Risks Tab */}
        <TabsContent value="alerts">
          {health && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader><CardTitle className="text-base flex items-center gap-2"><Bell className="h-4 w-4" /> Active Alerts</CardTitle></CardHeader>
                <CardContent className="space-y-2">
                  {[
                    { label: "Critical", value: health.alerts.critical, color: "text-red-600" },
                    { label: "High", value: health.alerts.high, color: "text-orange-600" },
                    { label: "Warning", value: health.alerts.warning, color: "text-amber-600" },
                    { label: "Info", value: health.alerts.info, color: "text-blue-600" },
                  ].map((s) => (
                    <div key={s.label} className="flex justify-between text-sm">
                      <span className="text-muted-foreground">{s.label}</span>
                      <span className={cn("font-medium", s.color)}>{s.value}</span>
                    </div>
                  ))}
                </CardContent>
              </Card>
              <Card>
                <CardHeader><CardTitle className="text-base flex items-center gap-2"><Shield className="h-4 w-4" /> Risks</CardTitle></CardHeader>
                <CardContent className="space-y-2">
                  {[
                    { label: "Total Open", value: health.risks.total, color: "text-gray-600" },
                    { label: "Critical", value: health.risks.critical, color: "text-red-600" },
                    { label: "High", value: health.risks.high, color: "text-orange-600" },
                    { label: "Unmitigated", value: health.risks.unmitigated, color: "text-amber-600" },
                  ].map((s) => (
                    <div key={s.label} className="flex justify-between text-sm">
                      <span className="text-muted-foreground">{s.label}</span>
                      <span className={cn("font-medium", s.color)}>{s.value}</span>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        {/* Deadlines Tab */}
        <TabsContent value="deadlines">
          {health && (
            <div className="grid grid-cols-3 gap-3">
              <Card>
                <CardContent className="p-4 text-center">
                  <XCircle className="h-6 w-6 text-red-600 mx-auto mb-2" />
                  <p className="text-3xl font-bold text-red-600">{health.deadlines.overdueTasks}</p>
                  <p className="text-sm text-muted-foreground">Overdue Tasks</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <Calendar className="h-6 w-6 text-amber-600 mx-auto mb-2" />
                  <p className="text-3xl font-bold text-amber-600">{health.deadlines.tasksDueToday}</p>
                  <p className="text-sm text-muted-foreground">Due Today</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <Clock className="h-6 w-6 text-blue-600 mx-auto mb-2" />
                  <p className="text-3xl font-bold text-blue-600">{health.deadlines.tasksDueThisWeek}</p>
                  <p className="text-sm text-muted-foreground">Due This Week</p>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        {/* Timeline Tab */}
        <TabsContent value="timeline" className="space-y-3">
          {timeline.length === 0 ? (
            <Card><CardContent className="p-6 text-center text-muted-foreground">No alert data for the past 7 days</CardContent></Card>
          ) : (
            <Card>
              <CardHeader><CardTitle className="text-base">Alert Timeline (7 days)</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {timeline.map((entry) => (
                    <div key={entry.date} className="flex items-center gap-3 text-sm">
                      <span className="w-24 text-muted-foreground font-mono text-xs">{entry.date}</span>
                      <div className="flex-1 flex items-center gap-1">
                        {entry.critical > 0 && <span className="h-4 bg-red-500 rounded" style={{ width: `${Math.min(entry.critical * 20, 100)}%` }} />}
                        {entry.high > 0 && <span className="h-4 bg-orange-500 rounded" style={{ width: `${Math.min(entry.high * 20, 100)}%` }} />}
                        {entry.warning > 0 && <span className="h-4 bg-amber-500 rounded" style={{ width: `${Math.min(entry.warning * 20, 100)}%` }} />}
                        {entry.info > 0 && <span className="h-4 bg-blue-500 rounded" style={{ width: `${Math.min(entry.info * 20, 100)}%` }} />}
                      </div>
                      <span className="w-8 text-right font-medium">{entry.total}</span>
                    </div>
                  ))}
                </div>
                <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1"><span className="w-3 h-3 bg-red-500 rounded" /> Critical</span>
                  <span className="flex items-center gap-1"><span className="w-3 h-3 bg-orange-500 rounded" /> High</span>
                  <span className="flex items-center gap-1"><span className="w-3 h-3 bg-amber-500 rounded" /> Warning</span>
                  <span className="flex items-center gap-1"><span className="w-3 h-3 bg-blue-500 rounded" /> Info</span>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
