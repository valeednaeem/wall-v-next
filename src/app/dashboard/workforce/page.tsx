"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Users, Bot, Activity, AlertTriangle, CheckCircle2, XCircle,
  RefreshCw, Shield, Zap, Settings, TrendingUp, TrendingDown,
  Search, Loader2, Eye, BarChart3,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";

interface AgentCapability {
  agentId: string;
  name: string;
  slug: string;
  status: string;
  division: string;
  role: string;
  type: string;
  isClientFacing: boolean;
  isMasterAgent: boolean;
  model: string;
  skills: { name: string; category: string; status: string }[];
  tools: { name: string; category: string; type: string; riskLevel: string; status: string }[];
  workflows: { name: string; status: string; triggerType: string }[];
  channels: Record<string, boolean>;
  healthScore: number;
  healthStatus: string;
  stats: { totalExecutions: number; successRate: number; failureRate: number; lastActive?: string };
  workload: { activeTasks: number; totalTasks: number; utilizationPercent: number; status: string };
  configuration: { isFullyConfigured: boolean; missingConfig: string[] };
}

interface HumanCapability {
  userId: string;
  name: string;
  email: string;
  role: string;
  jobTitle: string;
  isActive: boolean;
  lastLogin?: string;
  workload: { activeTasks: number; totalTasks: number; completedTasks: number; utilizationPercent: number; status: string };
  recentActivity: { tasksCompletedLast7Days: number; tasksCompletedLast30Days: number };
}

interface WorkforceSummary {
  ai: { total: number; active: number; healthy: number; degraded: number; unhealthy: number; available: number; overloaded: number; avgHealthScore: number };
  human: { total: number; active: number; available: number; overloaded: number; avgUtilization: number };
  gaps: { skillGaps: string[]; overloadedResources: string[]; unhealthyAgents: string[] };
}

const HEALTH_COLORS: Record<string, string> = {
  healthy: "bg-emerald-100 text-emerald-700",
  degraded: "bg-amber-100 text-amber-700",
  unhealthy: "bg-red-100 text-red-700",
  offline: "bg-gray-100 text-gray-600",
};

const WORKLOAD_COLORS: Record<string, string> = {
  available: "bg-emerald-100 text-emerald-700",
  "near-capacity": "bg-amber-100 text-amber-700",
  "at-capacity": "bg-orange-100 text-orange-700",
  overloaded: "bg-red-100 text-red-700",
};

export default function WorkforcePage() {
  const [agents, setAgents] = useState<AgentCapability[]>([]);
  const [humans, setHumans] = useState<HumanCapability[]>([]);
  const [summary, setSummary] = useState<WorkforceSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");
  const [search, setSearch] = useState("");

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [summaryRes, aiRes, humanRes] = await Promise.all([
        fetch("/api/pm/workforce", { credentials: "include" }),
        fetch("/api/pm/workforce?view=ai", { credentials: "include" }),
        fetch("/api/pm/workforce?view=human", { credentials: "include" }),
      ]);

      const [summaryData, aiData, humanData] = await Promise.all([
        summaryRes.json(),
        aiRes.json(),
        humanRes.json(),
      ]);

      if (summaryData.summary) setSummary(summaryData.summary);
      if (aiData.agents) setAgents(aiData.agents);
      if (humanData.humans) setHumans(humanData.humans);
    } catch (err) {
      console.error("Failed to fetch workforce data:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const filteredAgents = agents.filter((a) =>
    !search || a.name.toLowerCase().includes(search.toLowerCase()) || a.division?.toLowerCase().includes(search.toLowerCase())
  );

  const filteredHumans = humans.filter((h) =>
    !search || h.name.toLowerCase().includes(search.toLowerCase()) || h.role.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Users className="h-6 w-6 text-blue-600" />
            Workforce
          </h1>
          <p className="text-sm text-muted-foreground">AI + Human resource management</p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchData} disabled={loading}>
          <RefreshCw className={cn("h-4 w-4 mr-1", loading && "animate-spin")} />
          Refresh
        </Button>
      </div>

      {/* Summary Cards */}
      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => <Card key={i}><CardContent className="p-3"><Skeleton className="h-16 w-full" /></CardContent></Card>)}
        </div>
      ) : summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card>
            <CardContent className="p-3">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-blue-50"><Bot className="h-4 w-4 text-blue-600" /></div>
                <div>
                  <p className="text-xs text-muted-foreground">AI Agents</p>
                  <p className="text-xl font-bold">{summary.ai.total}</p>
                  <p className="text-[10px] text-muted-foreground">{summary.ai.active} active, avg health {summary.ai.avgHealthScore}%</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-emerald-50"><Users className="h-4 w-4 text-emerald-600" /></div>
                <div>
                  <p className="text-xs text-muted-foreground">Human Staff</p>
                  <p className="text-xl font-bold">{summary.human.total}</p>
                  <p className="text-[10px] text-muted-foreground">{summary.human.active} active, {summary.human.avgUtilization}% avg utilization</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-red-50"><AlertTriangle className="h-4 w-4 text-red-600" /></div>
                <div>
                  <p className="text-xs text-muted-foreground">Overloaded</p>
                  <p className="text-xl font-bold">{summary.ai.overloaded + summary.human.overloaded}</p>
                  <p className="text-[10px] text-muted-foreground">{summary.ai.overloaded} AI, {summary.human.overloaded} human</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-amber-50"><Zap className="h-4 w-4 text-amber-600" /></div>
                <div>
                  <p className="text-xs text-muted-foreground">Gaps</p>
                  <p className="text-xl font-bold">{summary.gaps.skillGaps.length}</p>
                  <p className="text-[10px] text-muted-foreground">{summary.gaps.skillGaps.slice(0, 2).join(", ") || "none"}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search workforce..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="ai">AI Agents ({agents.length})</TabsTrigger>
          <TabsTrigger value="human">Human Staff ({humans.length})</TabsTrigger>
          {summary?.gaps.skillGaps.length ? <TabsTrigger value="gaps">Gaps ({summary.gaps.skillGaps.length})</TabsTrigger> : null}
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader><CardTitle className="text-base">AI Health Distribution</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {summary && [
                  { label: "Healthy", value: summary.ai.healthy, color: "text-emerald-600" },
                  { label: "Degraded", value: summary.ai.degraded, color: "text-amber-600" },
                  { label: "Unhealthy", value: summary.ai.unhealthy, color: "text-red-600" },
                  { label: "Available", value: summary.ai.available, color: "text-blue-600" },
                  { label: "Overloaded", value: summary.ai.overloaded, color: "text-red-600" },
                ].map((s) => (
                  <div key={s.label} className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{s.label}</span>
                    <span className={cn("font-medium", s.color)}>{s.value}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-base">Human Workload</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {summary && [
                  { label: "Active", value: summary.human.active, color: "text-emerald-600" },
                  { label: "Available", value: summary.human.available, color: "text-blue-600" },
                  { label: "Overloaded", value: summary.human.overloaded, color: "text-red-600" },
                  { label: "Avg Utilization", value: `${summary.human.avgUtilization}%`, color: "text-gray-600" },
                ].map((s) => (
                  <div key={s.label} className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{s.label}</span>
                    <span className={cn("font-medium", s.color)}>{s.value}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* AI Agents Tab */}
        <TabsContent value="ai" className="space-y-3">
          {filteredAgents.map((agent) => (
            <Card key={agent.agentId}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium">{agent.name}</p>
                      <Badge className={cn("text-[10px]", HEALTH_COLORS[agent.healthStatus])}>{agent.healthStatus}</Badge>
                      <Badge className={cn("text-[10px]", WORKLOAD_COLORS[agent.workload.status])}>{agent.workload.status}</Badge>
                      {agent.isMasterAgent && <Badge variant="outline" className="text-[10px]">Master</Badge>}
                      {agent.isClientFacing && <Badge variant="outline" className="text-[10px]">Client</Badge>}
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                      <span>{agent.division || "No division"}</span>
                      <span>{agent.role}</span>
                      <span>{agent.model}</span>
                      <span>{agent.type}</span>
                    </div>
                    <div className="flex items-center gap-4 mt-2 text-xs">
                      <span>Health: <strong>{agent.healthScore}%</strong></span>
                      <span>Executions: {agent.stats.totalExecutions}</span>
                      <span>Success: {agent.stats.successRate}%</span>
                      <span>Tasks: {agent.workload.activeTasks}/{agent.workload.totalTasks}</span>
                    </div>
                    {agent.skills.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {agent.skills.map((s, i) => <Badge key={i} variant="secondary" className="text-[10px]">{s.name}</Badge>)}
                      </div>
                    )}
                    {!agent.configuration.isFullyConfigured && (
                      <div className="mt-2">
                        <Badge variant="destructive" className="text-[10px]">Missing: {agent.configuration.missingConfig.join(", ")}</Badge>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        {/* Human Staff Tab */}
        <TabsContent value="human" className="space-y-3">
          {filteredHumans.map((human) => (
            <Card key={human.userId}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{human.name}</p>
                      <Badge className={cn("text-[10px]", WORKLOAD_COLORS[human.workload.status])}>{human.workload.status}</Badge>
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                      <span>{human.role}</span>
                      {human.jobTitle && <span>{human.jobTitle}</span>}
                      <span>{human.email}</span>
                    </div>
                    <div className="flex items-center gap-4 mt-2 text-xs">
                      <span>Tasks: {human.workload.activeTasks} active, {human.workload.completedTasks} completed</span>
                      <span>Utilization: {human.workload.utilizationPercent}%</span>
                      <span>Last 7d: {human.recentActivity.tasksCompletedLast7Days} done</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        {/* Gaps Tab */}
        <TabsContent value="gaps" className="space-y-4">
          {summary?.gaps.skillGaps.length ? (
            <Card>
              <CardHeader><CardTitle className="text-base">Skill Gaps</CardTitle></CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {summary.gaps.skillGaps.map((gap) => (
                    <Badge key={gap} variant="destructive">{gap}</Badge>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground mt-3">These skills have no AI agent coverage.</p>
              </CardContent>
            </Card>
          ) : null}
          {summary?.gaps.overloadedResources.length ? (
            <Card>
              <CardHeader><CardTitle className="text-base">Overloaded Resources</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-1">
                  {summary.gaps.overloadedResources.map((r) => (
                    <div key={r} className="flex items-center gap-2 text-sm">
                      <AlertTriangle className="h-3 w-3 text-red-600" />
                      <span>{r}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ) : null}
          {summary?.gaps.unhealthyAgents.length ? (
            <Card>
              <CardHeader><CardTitle className="text-base">Unhealthy Agents</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-1">
                  {summary.gaps.unhealthyAgents.map((a) => (
                    <div key={a} className="flex items-center gap-2 text-sm">
                      <XCircle className="h-3 w-3 text-red-600" />
                      <span>{a}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ) : null}
        </TabsContent>
      </Tabs>
    </div>
  );
}
