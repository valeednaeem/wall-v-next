"use client";

import { useState, useEffect, useCallback } from "react";
import {
  GitBranch, RefreshCw, Play, Loader2, Plus, Copy, Clock,
  CheckCircle2, XCircle, AlertTriangle, Zap, Eye, Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";

interface Workflow {
  _id: string;
  name: string;
  description: string;
  status: string;
  trigger: { type: string; value: string };
  steps: { order: number; agent: any; onError: string }[];
  usage: { totalRuns: number; lastRun: string; successRate: number; avgDuration: number };
  createdAt: string;
}

interface WorkflowTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  triggerType: string;
  steps: { name: string; agentRole: string; action: string }[];
}

const CATEGORY_COLORS: Record<string, string> = {
  client: "bg-blue-100 text-blue-700",
  project: "bg-emerald-100 text-emerald-700",
  sales: "bg-purple-100 text-purple-700",
  support: "bg-amber-100 text-amber-700",
  finance: "bg-green-100 text-green-700",
  technical: "bg-cyan-100 text-cyan-700",
};

const STATUS_COLORS: Record<string, string> = {
  active: "bg-emerald-100 text-emerald-700",
  inactive: "bg-gray-100 text-gray-700",
  draft: "bg-amber-100 text-amber-700",
};

export default function WorkflowsPage() {
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [templates, setTemplates] = useState<WorkflowTemplate[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [executing, setExecuting] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("workflows");

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [wfRes, tplRes, histRes] = await Promise.all([
        fetch("/api/pm/workflows?action=list", { credentials: "include" }),
        fetch("/api/pm/workflows?action=templates", { credentials: "include" }),
        fetch("/api/pm/workflows?action=history", { credentials: "include" }),
      ]);
      const [wfData, tplData, histData] = await Promise.all([wfRes.json(), tplRes.json(), histRes.json()]);
      if (wfData.workflows) setWorkflows(wfData.workflows);
      if (tplData.templates) setTemplates(tplData.templates);
      if (histData.history) setHistory(histData.history);
    } catch (err) {
      console.error("Failed to fetch workflows data:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const createFromTemplate = async (templateId: string) => {
    try {
      await fetch("/api/pm/workflows", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "create-from-template", templateId }),
        credentials: "include",
      });
      await fetchData();
    } catch (err) {
      console.error("Failed to create workflow:", err);
    }
  };

  const executeWorkflow = async (workflowId: string) => {
    setExecuting(workflowId);
    try {
      await fetch("/api/pm/workflows", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "execute", workflowId }),
        credentials: "include",
      });
      await fetchData();
    } finally {
      setExecuting(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <GitBranch className="h-6 w-6 text-blue-600" />
            Workflows
          </h1>
          <p className="text-sm text-muted-foreground">Automation workflows and templates</p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchData} disabled={loading}>
          <RefreshCw className={cn("h-4 w-4 mr-1", loading && "animate-spin")} />
          Refresh
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="workflows">Workflows ({workflows.length})</TabsTrigger>
          <TabsTrigger value="templates">Templates ({templates.length})</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>

        {/* Workflows Tab */}
        <TabsContent value="workflows" className="space-y-3">
          {loading ? (
            Array.from({ length: 3 }).map((_, i) => <Card key={i}><CardContent className="p-3"><Skeleton className="h-16 w-full" /></CardContent></Card>)
          ) : workflows.length === 0 ? (
            <Card><CardContent className="p-6 text-center text-muted-foreground">No workflows created yet. Use templates to get started.</CardContent></Card>
          ) : (
            workflows.map((wf) => (
              <Card key={wf._id}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{wf.name}</p>
                        <Badge className={cn("text-[10px]", STATUS_COLORS[wf.status])}>{wf.status}</Badge>
                        <Badge variant="outline" className="text-[10px]">{wf.trigger?.type}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">{wf.description}</p>
                      <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                        <span>Steps: {wf.steps?.length || 0}</span>
                        <span>Runs: {wf.usage?.totalRuns || 0}</span>
                        <span>Success: {wf.usage?.successRate || 0}%</span>
                        <span>Avg: {wf.usage?.avgDuration || 0}ms</span>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => executeWorkflow(wf._id)}
                      disabled={executing === wf._id || wf.status !== "active"}
                    >
                      {executing === wf._id ? (
                        <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                      ) : (
                        <Play className="h-4 w-4 mr-1" />
                      )}
                      Run
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        {/* Templates Tab */}
        <TabsContent value="templates" className="space-y-3">
          {loading ? (
            Array.from({ length: 3 }).map((_, i) => <Card key={i}><CardContent className="p-3"><Skeleton className="h-20 w-full" /></CardContent></Card>)
          ) : (
            templates.map((tpl) => (
              <Card key={tpl.id}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{tpl.name}</p>
                        <Badge className={cn("text-[10px]", CATEGORY_COLORS[tpl.category])}>{tpl.category}</Badge>
                        <Badge variant="outline" className="text-[10px]">{tpl.triggerType}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">{tpl.description}</p>
                      <div className="flex flex-wrap gap-1 mt-2">
                        {tpl.steps.map((s, i) => (
                          <Badge key={i} variant="secondary" className="text-[10px]">
                            {s.name} ({s.agentRole})
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <Button size="sm" variant="outline" onClick={() => createFromTemplate(tpl.id)}>
                      <Copy className="h-4 w-4 mr-1" />
                      Create
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history" className="space-y-3">
          {loading ? (
            <Card><CardContent className="p-3"><Skeleton className="h-10 w-full" /></CardContent></Card>
          ) : history.length === 0 ? (
            <Card><CardContent className="p-6 text-center text-muted-foreground">No workflow executions yet</CardContent></Card>
          ) : (
            history.map((h) => (
              <Card key={h._id}>
                <CardContent className="p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {h.result === "success" ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> : <XCircle className="h-4 w-4 text-red-600" />}
                      <div>
                        <p className="text-sm font-medium">{h.description}</p>
                        <p className="text-xs text-muted-foreground">{new Date(h.createdAt).toLocaleString()}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge className={cn("text-[10px]", h.result === "success" ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700")}>{h.result}</Badge>
                      {h.duration && <p className="text-xs text-muted-foreground mt-1">{h.duration}ms</p>}
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
