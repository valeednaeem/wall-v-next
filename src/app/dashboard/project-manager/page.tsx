"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  ClipboardList, AlertTriangle, CheckCircle2, XCircle, Clock, Users, Bot,
  BarChart3, Activity, Shield, FileText, ArrowUpRight, ArrowDownRight,
  Loader2, RefreshCw, Zap, TrendingUp, AlertCircle, Eye, Calendar,
  Target, Layers, Settings, MessageSquare, ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";

interface PMOverview {
  projects: { total: number; active: number; blocked: number; atRisk: number; completed: number };
  tasks: { total: number; overdue: number; active: number };
  agents: { total: number; active: number; failed: number };
  humans: { total: number; active: number };
  approvals: { pending: number };
  alerts: { active: number; critical: number };
  risks: { open: number; critical: number };
  issues: { open: number; critical: number };
  intake: { pending: number; recent: any[] };
}

interface CapacityData {
  agents: any[];
  humans: any[];
}

const SEVERITY_COLORS: Record<string, string> = {
  info: "bg-blue-100 text-blue-700",
  warning: "bg-amber-100 text-amber-700",
  high: "bg-orange-100 text-orange-700",
  critical: "bg-red-100 text-red-700",
  low: "bg-gray-100 text-gray-600",
  medium: "bg-amber-100 text-amber-700",
  bug: "bg-red-100 text-red-700",
  blocker: "bg-red-200 text-red-800",
  security: "bg-purple-100 text-purple-700",
};

const STATUS_COLORS: Record<string, string> = {
  active: "bg-emerald-100 text-emerald-700",
  blocked: "bg-red-100 text-red-700",
  "at-risk": "bg-amber-100 text-amber-700",
  completed: "bg-blue-100 text-blue-700",
  available: "bg-emerald-100 text-emerald-700",
  "near-capacity": "bg-amber-100 text-amber-700",
  overloaded: "bg-red-100 text-red-700",
  pending: "bg-amber-100 text-amber-700",
};

export default function ProjectManagerPage() {
  const [overview, setOverview] = useState<PMOverview | null>(null);
  const [capacity, setCapacity] = useState<CapacityData | null>(null);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [risks, setRisks] = useState<any[]>([]);
  const [issues, setIssues] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [overviewRes, capacityRes, alertsRes, risksRes, issuesRes] = await Promise.all([
        fetch("/api/pm?section=overview", { credentials: "include" }),
        fetch("/api/pm/capacity", { credentials: "include" }),
        fetch("/api/pm/alerts?status=active&limit=10", { credentials: "include" }),
        fetch("/api/pm/risks?status=identified&limit=10", { credentials: "include" }),
        fetch("/api/pm/issues?status=detected&limit=10", { credentials: "include" }),
      ]);

      const [overviewData, capacityData, alertsData, risksData, issuesData] = await Promise.all([
        overviewRes.json(),
        capacityRes.json(),
        alertsRes.json(),
        risksRes.json(),
        issuesRes.json(),
      ]);

      if (overviewData.overview) setOverview(overviewData.overview);
      if (capacityData.agents) setCapacity(capacityData);
      if (alertsData.alerts) setAlerts(alertsData.alerts);
      if (risksData.risks) setRisks(risksData.risks);
      if (issuesData.issues) setIssues(issuesData.issues);
    } catch (err) {
      console.error("Failed to fetch PM data:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ClipboardList className="h-6 w-6 text-teal-600" />
            Project Manager
          </h1>
          <p className="text-sm text-muted-foreground">AI Workforce Orchestrator — Operational Command Center</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={fetchData} disabled={loading}>
            <RefreshCw className={cn("h-4 w-4 mr-1", loading && "animate-spin")} />
            Refresh
          </Button>
          <Link href="/dashboard/project-manager/chat">
            <Button size="sm">
              <MessageSquare className="h-4 w-4 mr-1" />
              Chat with PM
            </Button>
          </Link>
        </div>
      </div>

      {/* Command Summary */}
      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i}><CardContent className="p-3"><Skeleton className="h-16 w-full" /></CardContent></Card>
          ))}
        </div>
      ) : overview && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {[
            { label: "Active Projects", value: overview.projects.active, icon: Layers, color: "text-blue-600", bg: "bg-blue-50", sub: `${overview.projects.total} total` },
            { label: "Blocked", value: overview.projects.blocked, icon: XCircle, color: "text-red-600", bg: "bg-red-50", sub: "need attention" },
            { label: "Overdue Tasks", value: overview.tasks.overdue, icon: Clock, color: "text-orange-600", bg: "bg-orange-50", sub: `${overview.tasks.active} active` },
            { label: "Active Alerts", value: overview.alerts.active, icon: AlertTriangle, color: "text-amber-600", bg: "bg-amber-50", sub: `${overview.alerts.critical} critical` },
            { label: "Open Risks", value: overview.risks.open, icon: Shield, color: "text-purple-600", bg: "bg-purple-50", sub: `${overview.risks.critical} critical` },
            { label: "Open Issues", value: overview.issues.open, icon: Bug, color: "text-rose-600", bg: "bg-rose-50", sub: `${overview.issues.critical} critical` },
          ].map((stat) => (
            <Card key={stat.label}>
              <CardContent className="p-3">
                <div className="flex items-center gap-2">
                  <div className={cn("p-1.5 rounded-lg", stat.bg)}><stat.icon className={cn("h-4 w-4", stat.color)} /></div>
                  <div>
                    <p className="text-xs text-muted-foreground">{stat.label}</p>
                    <p className="text-xl font-bold">{stat.value}</p>
                    <p className="text-[10px] text-muted-foreground">{stat.sub}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="w-full justify-start overflow-x-auto">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="capacity">Capacity</TabsTrigger>
          <TabsTrigger value="alerts">Alerts</TabsTrigger>
          <TabsTrigger value="risks">Risks</TabsTrigger>
          <TabsTrigger value="issues">Issues</TabsTrigger>
          <TabsTrigger value="intake">Intake</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Projects Summary */}
            <Card>
              <CardHeader><CardTitle className="text-base flex items-center gap-2"><Layers className="h-4 w-4" />Projects</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {overview && Object.entries(overview.projects).map(([key, val]) => (
                  <div key={key} className="flex justify-between text-sm">
                    <span className="text-muted-foreground capitalize">{key}</span>
                    <span className="font-medium">{val as number}</span>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Workforce Summary */}
            <Card>
              <CardHeader><CardTitle className="text-base flex items-center gap-2"><Users className="h-4 w-4" />Workforce</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {overview && (
                  <>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">AI Agents (Active)</span>
                      <span className="font-medium">{overview.agents.active}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">AI Agents (Failed)</span>
                      <span className="font-medium text-red-600">{overview.agents.failed}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Human Staff (Active)</span>
                      <span className="font-medium">{overview.humans.active}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Pending Approvals</span>
                      <span className="font-medium text-amber-600">{overview.approvals.pending}</span>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Recent Intake */}
            <Card>
              <CardHeader><CardTitle className="text-base flex items-center gap-2"><Target className="h-4 w-4" />Recent Intake</CardTitle></CardHeader>
              <CardContent>
                {overview?.intake.recent.length ? (
                  <div className="space-y-2">
                    {overview.intake.recent.slice(0, 5).map((item: any) => (
                      <div key={item._id} className="flex items-center justify-between text-sm p-2 rounded bg-muted/30">
                        <div className="min-w-0">
                          <p className="font-medium truncate">{item.title}</p>
                          <p className="text-xs text-muted-foreground">{item.source} — {item.clientName || "Unknown"}</p>
                        </div>
                        <Badge className={cn("text-[10px]", STATUS_COLORS[item.triageStatus])}>{item.triageStatus}</Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">No pending intake</p>
                )}
              </CardContent>
            </Card>

            {/* System Health */}
            <Card>
              <CardHeader><CardTitle className="text-base flex items-center gap-2"><Activity className="h-4 w-4" />System Health</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {overview && (
                  <>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Total Projects</span>
                      <span className="font-medium">{overview.projects.total}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Total Tasks</span>
                      <span className="font-medium">{overview.tasks.total}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">AI Agents (Total)</span>
                      <span className="font-medium">{overview.agents.total}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Pending Intake</span>
                      <span className="font-medium">{overview.intake.pending}</span>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Capacity Tab */}
        <TabsContent value="capacity" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* AI Workforce */}
            <Card>
              <CardHeader><CardTitle className="text-base flex items-center gap-2"><Bot className="h-4 w-4" />AI Workforce Capacity</CardTitle></CardHeader>
              <CardContent>
                {capacity?.agents.length ? (
                  <div className="space-y-2">
                    {capacity.agents.map((agent: any) => (
                      <div key={agent._id} className="flex items-center justify-between text-sm p-2 rounded bg-muted/30">
                        <div className="min-w-0">
                          <p className="font-medium truncate">{agent.name}</p>
                          <p className="text-xs text-muted-foreground">{agent.division || "No division"} — {agent.activeTasks || 0} active tasks</p>
                        </div>
                        <Badge className={cn("text-[10px]", STATUS_COLORS[agent.status])}>{agent.status}</Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">No agents</p>
                )}
              </CardContent>
            </Card>

            {/* Human Workforce */}
            <Card>
              <CardHeader><CardTitle className="text-base flex items-center gap-2"><Users className="h-4 w-4" />Human Workforce Capacity</CardTitle></CardHeader>
              <CardContent>
                {capacity?.humans.length ? (
                  <div className="space-y-2">
                    {capacity.humans.map((human: any) => (
                      <div key={human._id} className="flex items-center justify-between text-sm p-2 rounded bg-muted/30">
                        <div className="min-w-0">
                          <p className="font-medium truncate">{human.name}</p>
                          <p className="text-xs text-muted-foreground">{human.role} — {human.activeTasks || 0} active tasks</p>
                        </div>
                        <Badge className={cn("text-[10px]", STATUS_COLORS[human.status])}>{human.status}</Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">No human resources</p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Alerts Tab */}
        <TabsContent value="alerts" className="space-y-4">
          <Card>
            <CardContent className="p-0">
              {alerts.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">
                  <CheckCircle2 className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>No active alerts</p>
                </div>
              ) : (
                <div className="divide-y">
                  {alerts.map((alert: any) => (
                    <div key={alert._id} className="p-4 hover:bg-muted/30">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-sm">{alert.title}</p>
                            <Badge className={cn("text-[10px]", SEVERITY_COLORS[alert.severity])}>{alert.severity}</Badge>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">{alert.message}</p>
                          <p className="text-xs text-muted-foreground mt-1">{alert.category} — {new Date(alert.createdAt).toLocaleDateString()}</p>
                        </div>
                        {alert.actionRequired && <Badge variant="outline" className="text-[10px] shrink-0">Action Required</Badge>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Risks Tab */}
        <TabsContent value="risks" className="space-y-4">
          <Card>
            <CardContent className="p-0">
              {risks.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">
                  <Shield className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>No identified risks</p>
                </div>
              ) : (
                <div className="divide-y">
                  {risks.map((risk: any) => (
                    <div key={risk._id} className="p-4 hover:bg-muted/30">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-sm">{risk.title}</p>
                            <Badge className={cn("text-[10px]", SEVERITY_COLORS[risk.severity])}>{risk.severity}</Badge>
                            <Badge variant="outline" className="text-[10px]">{risk.category}</Badge>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">{risk.description}</p>
                          {risk.mitigation && <p className="text-xs text-muted-foreground mt-1">Mitigation: {risk.mitigation}</p>}
                        </div>
                        <Badge className={cn("text-[10px]", STATUS_COLORS[risk.status])}>{risk.status}</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Issues Tab */}
        <TabsContent value="issues" className="space-y-4">
          <Card>
            <CardContent className="p-0">
              {issues.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">
                  <CheckCircle2 className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>No open issues</p>
                </div>
              ) : (
                <div className="divide-y">
                  {issues.map((issue: any) => (
                    <div key={issue._id} className="p-4 hover:bg-muted/30">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-sm">{issue.title}</p>
                            <Badge className={cn("text-[10px]", SEVERITY_COLORS[issue.severity])}>{issue.severity}</Badge>
                            <Badge variant="outline" className="text-[10px]">{issue.category}</Badge>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">{issue.description}</p>
                        </div>
                        <Badge className={cn("text-[10px]", STATUS_COLORS[issue.status])}>{issue.status}</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Intake Tab */}
        <TabsContent value="intake" className="space-y-4">
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground text-center py-8">Intake pipeline — incoming projects will appear here after triage.</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Bug(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="m8 2 1.88 1.88" /><path d="M14.12 3.88 16 2" /><path d="M9 7.13v-1a3.003 3.003 0 1 1 6 0v1" />
      <path d="M12 20c-3.3 0-6-2.7-6-6v-3a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v3c0 3.3-2.7 6-6 6" />
      <path d="M12 20v-9" /><path d="M6.53 9C4.6 8.8 3 7.1 3 5" /><path d="M6 13H2" /><path d="M3 21c0-2.1 1.7-3.9 3.8-4" />
      <path d="M20.97 5c0 2.1-1.6 3.8-3.5 4" /><path d="M22 13h-4" /><path d="M17.2 17c2.1.1 3.8 1.9 3.8 4" />
    </svg>
  );
}
