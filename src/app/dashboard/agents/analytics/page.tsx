"use client";

import { useState, useEffect, useCallback } from "react";
import {
  TrendingUp, DollarSign, Activity, Zap, Users, Loader2
} from "lucide-react";
import { cn } from "@/lib/utils";

interface TopAgent {
  _id: string; name: string; slug: string; role: string; division?: string;
  totalExecutions: number; completed: number; failed: number; successRate: number;
  totalCost: number; totalTokens: number; avgDuration: number;
}

interface DivisionStat {
  _id: string; totalExecutions: number; completed: number; failed: number; totalCost: number;
}

interface CostPoint { _id: string; executions: number; cost: number; tokens: number }

interface Analytics {
  topAgents: TopAgent[];
  divisionStats: DivisionStat[];
  costOverTime: CostPoint[];
  period: string;
}

export default function AnalyticsPage() {
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState("7d");

  const fetchAnalytics = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/agents/analytics?period=${period}`, { credentials: "include" });
      const data = await res.json();
      setAnalytics(data);
    } catch { console.error("Failed to fetch analytics"); } finally { setLoading(false); }
  }, [period]);

  useEffect(() => { fetchAnalytics(); }, [fetchAnalytics]);

  if (loading) return <div className="flex items-center justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  if (!analytics) return <p className="text-muted-foreground">Failed to load analytics</p>;

  const totalExecutions = analytics.topAgents.reduce((s, a) => s + a.totalExecutions, 0);
  const totalCost = analytics.topAgents.reduce((s, a) => s + a.totalCost, 0);
  const totalTokens = analytics.topAgents.reduce((s, a) => s + a.totalTokens, 0);
  const avgSuccess = analytics.topAgents.length ? Math.round(analytics.topAgents.reduce((s, a) => s + a.successRate, 0) / analytics.topAgents.length) : 100;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Performance Analytics</h1>
          <p className="text-sm text-muted-foreground">Agent utilization and performance metrics</p>
        </div>
        <select value={period} onChange={(e) => setPeriod(e.target.value)} className="rounded-lg border bg-background px-3 py-2 text-sm">
          <option value="7d">Last 7 days</option>
          <option value="30d">Last 30 days</option>
          <option value="90d">Last 90 days</option>
        </select>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Total Executions", value: totalExecutions.toLocaleString(), icon: Activity, color: "text-blue-600" },
          { label: "Total Cost", value: `$${totalCost.toFixed(2)}`, icon: DollarSign, color: "text-green-600" },
          { label: "Total Tokens", value: totalTokens.toLocaleString(), icon: Zap, color: "text-purple-600" },
          { label: "Avg Success Rate", value: `${avgSuccess}%`, icon: TrendingUp, color: "text-primary" },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-xl border p-4">
            <div className="flex items-center gap-2 mb-1"><s.icon className={cn("h-4 w-4", s.color)} /><span className="text-xs text-muted-foreground">{s.label}</span></div>
            <p className="text-2xl font-bold">{s.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Agents */}
        <div className="bg-white rounded-xl border p-4">
          <h2 className="text-sm font-semibold mb-3">Top Agents by Usage</h2>
          <div className="space-y-2">
            {analytics.topAgents.slice(0, 10).map((agent, i) => (
              <div key={agent._id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/30">
                <span className="text-xs font-bold text-muted-foreground w-5">{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{agent.name}</p>
                  <p className="text-xs text-muted-foreground">{agent.division || agent.role}</p>
                </div>
                <div className="text-right text-xs">
                  <p className="font-medium">{agent.totalExecutions} runs</p>
                  <p className={cn("font-medium", agent.successRate >= 90 ? "text-green-600" : agent.successRate >= 70 ? "text-amber-600" : "text-red-600")}>{Math.round(agent.successRate)}%</p>
                </div>
              </div>
            ))}
            {analytics.topAgents.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">No execution data for this period</p>}
          </div>
        </div>

        {/* Division Breakdown */}
        <div className="bg-white rounded-xl border p-4">
          <h2 className="text-sm font-semibold mb-3">Division Performance</h2>
          <div className="space-y-2">
            {analytics.divisionStats.map((div) => {
              const successRate = div.totalExecutions > 0 ? Math.round((div.completed / div.totalExecutions) * 100) : 100;
              return (
                <div key={div._id || "unknown"} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/30">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{div._id || "Unassigned"}</p>
                    <p className="text-xs text-muted-foreground">{div.totalExecutions} executions</p>
                  </div>
                  <div className="text-right text-xs">
                    <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                      <div className={cn("h-full rounded-full", successRate >= 90 ? "bg-green-500" : successRate >= 70 ? "bg-amber-500" : "bg-red-500")} style={{ width: `${successRate}%` }} />
                    </div>
                    <p className="mt-0.5">{successRate}% success</p>
                  </div>
                </div>
              );
            })}
            {analytics.divisionStats.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">No data</p>}
          </div>
        </div>
      </div>

      {/* Cost Over Time */}
      {analytics.costOverTime.length > 0 && (
        <div className="bg-white rounded-xl border p-4">
          <h2 className="text-sm font-semibold mb-3">Daily Activity</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead><tr className="border-b">
                <th className="text-left p-2 font-medium text-muted-foreground">Date</th>
                <th className="text-right p-2 font-medium text-muted-foreground">Executions</th>
                <th className="text-right p-2 font-medium text-muted-foreground">Cost</th>
                <th className="text-right p-2 font-medium text-muted-foreground">Tokens</th>
              </tr></thead>
              <tbody>
                {analytics.costOverTime.map((point) => (
                  <tr key={point._id} className="border-b hover:bg-muted/30">
                    <td className="p-2">{point._id}</td>
                    <td className="p-2 text-right">{point.executions}</td>
                    <td className="p-2 text-right">${point.cost.toFixed(4)}</td>
                    <td className="p-2 text-right">{point.tokens.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
