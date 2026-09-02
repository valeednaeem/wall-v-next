"use client";

import { useState, useEffect, useCallback } from "react";
import {
  DollarSign, TrendingUp, TrendingDown, AlertTriangle, CheckCircle2,
  RefreshCw, Loader2, BarChart3, CreditCard, Clock, ArrowUpRight,
  ArrowDownRight, Wallet, PiggyBank, Receipt,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";

interface FinancialSummary {
  totalRevenue: number;
  totalPending: number;
  totalOverdue: number;
  totalPaid: number;
  averageInvoiceValue: number;
  totalProjects: number;
  projectsOverBudget: number;
  projectsAtRisk: number;
  monthlyRevenue: { month: string; amount: number }[];
  topProjects: { name: string; budget: number; spent: number; utilization: number }[];
}

interface BudgetAlert {
  projectId: string;
  projectName: string;
  budget: number;
  spent: number;
  utilizationPercent: number;
  severity: string;
  message: string;
}

const formatCurrency = (amount: number) => `$${amount.toLocaleString()}`;

const STATUS_COLORS: Record<string, string> = {
  "under-budget": "bg-emerald-100 text-emerald-700",
  "on-budget": "bg-blue-100 text-blue-700",
  "at-risk": "bg-amber-100 text-amber-700",
  "over-budget": "bg-red-100 text-red-700",
};

export default function FinancialsPage() {
  const [summary, setSummary] = useState<FinancialSummary | null>(null);
  const [budgetAlerts, setBudgetAlerts] = useState<BudgetAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [summaryRes, alertsRes] = await Promise.all([
        fetch("/api/pm/financials?action=summary", { credentials: "include" }),
        fetch("/api/pm/financials?action=budget-alerts", { credentials: "include" }),
      ]);
      const [summaryData, alertsData] = await Promise.all([summaryRes.json(), alertsRes.json()]);
      if (summaryData.summary) setSummary(summaryData.summary);
      if (alertsData.alerts) setBudgetAlerts(alertsData.alerts);
    } catch (err) {
      console.error("Failed to fetch financial data:", err);
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
            <DollarSign className="h-6 w-6 text-blue-600" />
            Financials
          </h1>
          <p className="text-sm text-muted-foreground">Budget, invoicing, and revenue tracking</p>
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
                <div className="p-1.5 rounded-lg bg-emerald-50"><TrendingUp className="h-4 w-4 text-emerald-600" /></div>
                <div>
                  <p className="text-xs text-muted-foreground">Revenue</p>
                  <p className="text-xl font-bold">{formatCurrency(summary.totalPaid)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-amber-50"><Clock className="h-4 w-4 text-amber-600" /></div>
                <div>
                  <p className="text-xs text-muted-foreground">Pending</p>
                  <p className="text-xl font-bold">{formatCurrency(summary.totalPending)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-red-50"><AlertTriangle className="h-4 w-4 text-red-600" /></div>
                <div>
                  <p className="text-xs text-muted-foreground">Overdue</p>
                  <p className="text-xl font-bold">{formatCurrency(summary.totalOverdue)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-blue-50"><Wallet className="h-4 w-4 text-blue-600" /></div>
                <div>
                  <p className="text-xs text-muted-foreground">Avg Invoice</p>
                  <p className="text-xl font-bold">{formatCurrency(summary.averageInvoiceValue)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="projects">Projects</TabsTrigger>
          <TabsTrigger value="alerts">Budget Alerts ({budgetAlerts.length})</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          {loading ? (
            <Card><CardContent className="p-4"><Skeleton className="h-40 w-full" /></CardContent></Card>
          ) : summary && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Monthly Revenue Chart */}
              <Card>
                <CardHeader><CardTitle className="text-base">Monthly Revenue</CardTitle></CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {summary.monthlyRevenue.map((m) => (
                      <div key={m.month} className="flex items-center gap-3">
                        <span className="w-12 text-xs text-muted-foreground">{m.month}</span>
                        <div className="flex-1 h-4 bg-muted rounded overflow-hidden">
                          <div
                            className="h-full bg-emerald-500 rounded"
                            style={{ width: `${Math.min((m.amount / Math.max(...summary.monthlyRevenue.map((x) => x.amount), 1)) * 100, 100)}%` }}
                          />
                        </div>
                        <span className="w-20 text-right text-xs font-medium">{formatCurrency(m.amount)}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Quick Stats */}
              <Card>
                <CardHeader><CardTitle className="text-base">Quick Stats</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  {[
                    { label: "Total Projects", value: summary.totalProjects, icon: <BarChart3 className="h-4 w-4 text-blue-600" /> },
                    { label: "Over Budget", value: summary.projectsOverBudget, icon: <TrendingUp className="h-4 w-4 text-red-600" /> },
                    { label: "At Risk", value: summary.projectsAtRisk, icon: <AlertTriangle className="h-4 w-4 text-amber-600" /> },
                    { label: "Total Invoices", value: summary.totalPaid > 0 ? Math.round(summary.totalPaid / Math.max(summary.averageInvoiceValue, 1)) : 0, icon: <Receipt className="h-4 w-4 text-emerald-600" /> },
                  ].map((s) => (
                    <div key={s.label} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {s.icon}
                        <span className="text-sm text-muted-foreground">{s.label}</span>
                      </div>
                      <span className="font-medium">{s.value}</span>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        {/* Projects Tab */}
        <TabsContent value="projects" className="space-y-3">
          {loading ? (
            Array.from({ length: 3 }).map((_, i) => <Card key={i}><CardContent className="p-3"><Skeleton className="h-12 w-full" /></CardContent></Card>)
          ) : summary?.topProjects.map((project) => (
            <Card key={project.name}>
              <CardContent className="p-3">
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm">{project.name}</p>
                    <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                      <span>Budget: {formatCurrency(project.budget)}</span>
                      <span>Spent: {formatCurrency(project.spent)}</span>
                      <span>Utilization: {project.utilization}%</span>
                    </div>
                  </div>
                  <Badge className={cn("text-[10px]", STATUS_COLORS[project.utilization > 100 ? "over-budget" : project.utilization > 85 ? "at-risk" : project.utilization > 70 ? "on-budget" : "under-budget"])}>
                    {project.utilization > 100 ? "over-budget" : project.utilization > 85 ? "at-risk" : project.utilization > 70 ? "on-budget" : "under-budget"}
                  </Badge>
                </div>
                <div className="mt-2 h-2 bg-muted rounded overflow-hidden">
                  <div
                    className={cn("h-full rounded", project.utilization > 100 ? "bg-red-500" : project.utilization > 85 ? "bg-amber-500" : "bg-emerald-500")}
                    style={{ width: `${Math.min(project.utilization, 100)}%` }}
                  />
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        {/* Budget Alerts Tab */}
        <TabsContent value="alerts" className="space-y-3">
          {budgetAlerts.length === 0 ? (
            <Card><CardContent className="p-6 text-center text-muted-foreground">No budget alerts — all projects within budget</CardContent></Card>
          ) : (
            budgetAlerts.map((alert) => (
              <Card key={alert.projectId} className={cn(alert.severity === "critical" && "border-red-200")}>
                <CardContent className="p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {alert.severity === "critical" ? <AlertTriangle className="h-4 w-4 text-red-600" /> : <AlertTriangle className="h-4 w-4 text-amber-600" />}
                      <div>
                        <p className="font-medium text-sm">{alert.projectName}</p>
                        <p className="text-xs text-muted-foreground">{alert.message}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge className={cn("text-[10px]", alert.severity === "critical" ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700")}>
                        {alert.severity}
                      </Badge>
                      <p className="text-xs text-muted-foreground mt-1">{formatCurrency(alert.spent)} / {formatCurrency(alert.budget)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
