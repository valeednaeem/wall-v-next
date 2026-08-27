"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Workflow, Search, Loader2, Play, Pause, Trash2, ChevronRight,
  Settings, Zap, Clock, ArrowRight
} from "lucide-react";
import { cn } from "@/lib/utils";

interface WorkflowStep {
  order: number;
  agent: { _id: string; name: string; role: string };
  skill?: { _id: string; name: string; category: string };
  tool?: { _id: string; name: string; category: string };
  inputMapping: Record<string, unknown>;
  outputMapping: Record<string, unknown>;
  condition?: string;
  onError: "stop" | "skip" | "retry" | "escalate";
  timeout: number;
}

interface Workflow {
  _id: string;
  name: string;
  slug: string;
  description: string;
  status: string;
  trigger: { type: string; value: string };
  steps: WorkflowStep[];
  permissions: string[];
  context: { passProjectId: boolean; passClientId: boolean; passConversationId: boolean; inheritPermissions: boolean };
  usage: { totalRuns: number; lastRun?: string; successRate: number; avgDuration: number };
  createdBy: { name: string; email: string };
  createdAt: string;
}

const STATUS_COLORS: Record<string, string> = {
  active: "bg-green-100 text-green-700",
  inactive: "bg-gray-100 text-gray-600",
  draft: "bg-amber-100 text-amber-700",
};

const TRIGGER_ICONS: Record<string, typeof Workflow> = {
  manual: Play, event: Zap, schedule: Clock, webhook: Settings,
};

export default function WorkflowsPage() {
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const fetchWorkflows = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/agents/workflows", { credentials: "include" });
      const data = await res.json();
      setWorkflows(data.workflows || []);
    } catch { console.error("Failed to fetch workflows"); } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchWorkflows(); }, [fetchWorkflows]);

  const filtered = workflows.filter((w) => {
    if (search && !w.name.toLowerCase().includes(search.toLowerCase()) && !w.description.toLowerCase().includes(search.toLowerCase())) return false;
    if (filterStatus !== "all" && w.status !== filterStatus) return false;
    return true;
  });

  const handleToggleStatus = async (workflow: Workflow) => {
    const newStatus = workflow.status === "active" ? "inactive" : "active";
    try {
      await fetch(`/api/agents/workflows/${workflow._id}`, {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      setWorkflows(workflows.map((w) => w._id === workflow._id ? { ...w, status: newStatus } : w));
    } catch { console.error("Failed to toggle status"); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this workflow?")) return;
    try {
      await fetch(`/api/agents/workflows/${id}`, { method: "DELETE" });
      setWorkflows(workflows.filter((w) => w._id !== id));
    } catch { console.error("Failed to delete workflow"); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Workflows</h1>
          <p className="text-sm text-muted-foreground">Multi-step agent orchestration pipelines</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Total", value: workflows.length, icon: Workflow },
          { label: "Active", value: workflows.filter((w) => w.status === "active").length, icon: Play },
          { label: "Draft", value: workflows.filter((w) => w.status === "draft").length, icon: Settings },
          { label: "Total Runs", value: workflows.reduce((sum, w) => sum + (w.usage?.totalRuns || 0), 0), icon: Zap },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-xl border p-3">
            <div className="flex items-center gap-2">
              <s.icon className="h-4 w-4 text-muted-foreground" />
              <div><p className="text-xs text-muted-foreground">{s.label}</p><p className="text-lg font-bold">{s.value}</p></div>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input type="text" placeholder="Search workflows..." value={search} onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border bg-muted/50 pl-9 pr-4 py-2 text-sm" />
        </div>
        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}
          className="rounded-lg border bg-background px-3 py-2 text-sm">
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
          <option value="draft">Draft</option>
        </select>
      </div>

      {/* Workflows List */}
      {loading ? (
        <div className="flex items-center justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border">
          <Workflow className="h-12 w-12 text-muted-foreground mx-auto mb-3 opacity-50" />
          <p className="text-muted-foreground">No workflows found</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((workflow) => {
            const isExpanded = expandedId === workflow._id;
            const TriggerIcon = TRIGGER_ICONS[workflow.trigger?.type] || Play;
            return (
              <div key={workflow._id} className="bg-white rounded-xl border overflow-hidden">
                <button onClick={() => setExpandedId(isExpanded ? null : workflow._id)}
                  className="w-full text-left p-4 flex items-center gap-4 hover:bg-muted/30 transition-colors">
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <TriggerIcon className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold truncate">{workflow.name}</p>
                      <span className={cn("text-xs px-2 py-0.5 rounded", STATUS_COLORS[workflow.status])}>{workflow.status}</span>
                    </div>
                    <p className="text-xs text-muted-foreground truncate">{workflow.description}</p>
                    <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                      <span>{workflow.steps?.length || 0} steps</span>
                      <span>{workflow.usage?.totalRuns || 0} runs</span>
                      <span>{workflow.usage?.successRate || 100}% success</span>
                      <span>Trigger: {workflow.trigger?.type}</span>
                    </div>
                  </div>
                  <ChevronRight className={cn("h-4 w-4 text-muted-foreground transition-transform", isExpanded && "rotate-90")} />
                </button>

                {isExpanded && (
                  <div className="border-t p-4 space-y-4">
                    {/* Steps */}
                    <div>
                      <h4 className="text-sm font-semibold mb-2">Pipeline Steps</h4>
                      {workflow.steps?.length ? (
                        <div className="space-y-2">
                          {workflow.steps.sort((a, b) => a.order - b.order).map((step, i) => (
                            <div key={i} className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
                              <span className="text-xs font-bold text-muted-foreground w-6">{step.order}</span>
                              <ArrowRight className="h-3 w-3 text-muted-foreground" />
                              <div className="flex-1">
                                <p className="text-sm font-medium">{step.agent?.name || "Unknown Agent"}</p>
                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                  {step.skill && <span>Skill: {step.skill.name}</span>}
                                  {step.tool && <span>Tool: {step.tool.name}</span>}
                                  <span>Timeout: {step.timeout}ms</span>
                                  <span className={cn("px-1.5 py-0.5 rounded text-xs",
                                    step.onError === "stop" ? "bg-red-100 text-red-700" :
                                    step.onError === "retry" ? "bg-amber-100 text-amber-700" :
                                    step.onError === "skip" ? "bg-blue-100 text-blue-700" : "bg-purple-100 text-purple-700"
                                  )}>On error: {step.onError}</span>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : <p className="text-sm text-muted-foreground">No steps configured</p>}
                    </div>

                    {/* Context & Settings */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                      <div className="bg-muted/30 rounded-lg p-2">
                        <p className="text-muted-foreground">Pass Project ID</p>
                        <p className="font-medium">{workflow.context?.passProjectId ? "Yes" : "No"}</p>
                      </div>
                      <div className="bg-muted/30 rounded-lg p-2">
                        <p className="text-muted-foreground">Pass Client ID</p>
                        <p className="font-medium">{workflow.context?.passClientId ? "Yes" : "No"}</p>
                      </div>
                      <div className="bg-muted/30 rounded-lg p-2">
                        <p className="text-muted-foreground">Inherit Permissions</p>
                        <p className="font-medium">{workflow.context?.inheritPermissions ? "Yes" : "No"}</p>
                      </div>
                      <div className="bg-muted/30 rounded-lg p-2">
                        <p className="text-muted-foreground">Permissions</p>
                        <p className="font-medium">{workflow.permissions?.length || 0} required</p>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 pt-2 border-t">
                      <button onClick={() => handleToggleStatus(workflow)}
                        className="flex items-center gap-1 px-3 py-1.5 text-xs border rounded-lg hover:bg-muted">
                        {workflow.status === "active" ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
                        {workflow.status === "active" ? "Deactivate" : "Activate"}
                      </button>
                      <button onClick={() => handleDelete(workflow._id)}
                        className="flex items-center gap-1 px-3 py-1.5 text-xs text-destructive border border-destructive/20 rounded-lg hover:bg-destructive/10">
                        <Trash2 className="h-3 w-3" />Delete
                      </button>
                      <span className="text-xs text-muted-foreground ml-auto">Created by {workflow.createdBy?.name || "Unknown"}</span>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
