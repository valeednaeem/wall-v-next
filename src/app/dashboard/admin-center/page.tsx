"use client";

import { useState, useEffect, useCallback } from "react";
import {
  LayoutDashboard, RefreshCw, Activity, Users, Bot, FolderKanban,
  CheckSquare, AlertTriangle, DollarSign, Puzzle, GitBranch, Clock,
  TrendingUp, TrendingDown, Shield, Zap, FileText, Eye,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

interface AdminCenterData {
  overview: {
    totalProjects: number;
    activeProjects: number;
    totalTasks: number;
    activeTasks: number;
    totalAgents: number;
    activeAgents: number;
    totalUsers: number;
  };
  health: { overall: string; score: number };
  workforce: {
    ai: { total: number; active: number; healthy: number; overloaded: number };
    human: { total: number; active: number; available: number };
  };
  financial: { revenue: number; pending: number; overdue: number };
  alerts: { total: number; critical: number; high: number; warning: number };
  risks: { total: number; critical: number; high: number };
  issues: { total: number; critical: number };
  integrations: { total: number; active: number };
  quickActions: { id: string; label: string; description: string; color: string }[];
  recentActivity: { type: string; title: string; description: string; timestamp: string; icon: string }[];
}

const HEALTH_COLORS: Record<string, string> = {
  healthy: "bg-emerald-100 text-emerald-700",
  degraded: "bg-amber-100 text-amber-700",
  unhealthy: "bg-red-100 text-red-700",
};

const formatCurrency = (amount: number) => `$${amount.toLocaleString()}`;

export default function AdminCenterPage() {
  const [data, setData] = useState<AdminCenterData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/pm/admin-center", { credentials: "include" });
      const result = await res.json();
      if (result.data) setData(result.data);
    } catch (err) {
      console.error("Failed to fetch admin center data:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <LayoutDashboard className="h-6 w-6 text-blue-600" />
            Admin Control Center
          </h1>
          <p className="text-sm text-muted-foreground">Unified view of all PM subsystems</p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchData} disabled={loading}>
          <RefreshCw className={cn("h-4 w-4 mr-1", loading && "animate-spin")} />
          Refresh
        </Button>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {Array.from({ length: 8 }).map((_, i) => <Card key={i}><CardContent className="p-3"><Skeleton className="h-16 w-full" /></CardContent></Card>)}
        </div>
      ) : data && (
        <>
          {/* System Health */}
          <Card className={cn(data.health.overall === "unhealthy" && "border-red-200", data.health.overall === "degraded" && "border-amber-200")}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Activity className="h-6 w-6 text-blue-600" />
                  <div>
                    <p className="text-lg font-bold capitalize">{data.health.overall}</p>
                    <p className="text-xs text-muted-foreground">System Health: {data.health.score}%</p>
                  </div>
                </div>
                <Badge className={cn("text-xs", HEALTH_COLORS[data.health.overall])}>{data.health.overall}</Badge>
              </div>
            </CardContent>
          </Card>

          {/* Overview Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: "Projects", value: data.overview.totalProjects, sub: `${data.overview.activeProjects} active`, icon: <FolderKanban className="h-4 w-4 text-blue-600" /> },
              { label: "Tasks", value: data.overview.totalTasks, sub: `${data.overview.activeTasks} active`, icon: <CheckSquare className="h-4 w-4 text-emerald-600" /> },
              { label: "Agents", value: data.overview.totalAgents, sub: `${data.overview.activeAgents} active`, icon: <Bot className="h-4 w-4 text-purple-600" /> },
              { label: "Users", value: data.overview.totalUsers, sub: "staff members", icon: <Users className="h-4 w-4 text-orange-600" /> },
            ].map((s) => (
              <Card key={s.label}>
                <CardContent className="p-3">
                  <div className="flex items-center gap-2">
                    {s.icon}
                    <div>
                      <p className="text-xl font-bold">{s.value}</p>
                      <p className="text-[10px] text-muted-foreground">{s.label} — {s.sub}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Secondary Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Card>
              <CardContent className="p-3">
                <div className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-emerald-600" />
                  <div>
                    <p className="text-lg font-bold">{formatCurrency(data.financial.revenue)}</p>
                    <p className="text-[10px] text-muted-foreground">Revenue</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-red-600" />
                  <div>
                    <p className="text-lg font-bold">{data.alerts.total}</p>
                    <p className="text-[10px] text-muted-foreground">Alerts ({data.alerts.critical} critical)</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3">
                <div className="flex items-center gap-2">
                  <Shield className="h-4 w-4 text-amber-600" />
                  <div>
                    <p className="text-lg font-bold">{data.risks.total}</p>
                    <p className="text-[10px] text-muted-foreground">Risks ({data.risks.critical} critical)</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3">
                <div className="flex items-center gap-2">
                  <Puzzle className="h-4 w-4 text-cyan-600" />
                  <div>
                    <p className="text-lg font-bold">{data.integrations.active}/{data.integrations.total}</p>
                    <p className="text-[10px] text-muted-foreground">Integrations Active</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Quick Actions */}
            <Card>
              <CardHeader><CardTitle className="text-base flex items-center gap-2"><Zap className="h-4 w-4" /> Quick Actions</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {data.quickActions.map((action) => (
                  <div key={action.id} className="flex items-center justify-between p-2 rounded-lg border hover:bg-muted/50 cursor-pointer">
                    <div className="flex items-center gap-2">
                      <div className={cn("w-2 h-2 rounded-full", action.color)} />
                      <div>
                        <p className="text-sm font-medium">{action.label}</p>
                        <p className="text-xs text-muted-foreground">{action.description}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Recent Activity */}
            <Card>
              <CardHeader><CardTitle className="text-base flex items-center gap-2"><Clock className="h-4 w-4" /> Recent Activity</CardTitle></CardHeader>
              <CardContent className="space-y-2 max-h-64 overflow-y-auto">
                {data.recentActivity.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">No recent activity</p>
                ) : (
                  data.recentActivity.map((activity, i) => (
                    <div key={i} className="flex items-start gap-2 text-sm">
                      {activity.icon === "check" ? <CheckSquare className="h-3 w-3 text-emerald-600 mt-1" /> :
                       activity.icon === "x" ? <AlertTriangle className="h-3 w-3 text-red-600 mt-1" /> :
                       <Activity className="h-3 w-3 text-blue-600 mt-1" />}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-xs">{activity.title}</p>
                        <p className="text-xs text-muted-foreground truncate">{activity.description}</p>
                      </div>
                      <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                        {new Date(activity.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>

          {/* Workforce & Issues */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader><CardTitle className="text-base">Workforce</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">AI Agents</span>
                  <span>{data.workforce.ai.active}/{data.workforce.ai.total} active, {data.workforce.ai.healthy} healthy</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Human Staff</span>
                  <span>{data.workforce.human.active}/{data.workforce.human.total} active, {data.workforce.human.available} available</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Overloaded</span>
                  <span className={cn(data.workforce.ai.overloaded > 0 ? "text-red-600" : "text-emerald-600")}>{data.workforce.ai.overloaded} agents</span>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-base">Issues</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Open Issues</span>
                  <span>{data.issues.total}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Critical/Blocker</span>
                  <span className={cn(data.issues.critical > 0 ? "text-red-600" : "text-emerald-600")}>{data.issues.critical}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Financial Pending</span>
                  <span>{formatCurrency(data.financial.pending)}</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
