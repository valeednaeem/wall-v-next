"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import {
  Bot, Plus, Search, Play, Pause, Trash2, Loader2,
  MessageSquare, Zap, Settings, Activity, Users, BarChart3,
  Star, Globe, ChevronDown, ChevronRight, CheckSquare, Square,
  LayoutGrid, List, RefreshCw, XCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Agent {
  _id: string;
  name: string;
  slug: string;
  description: string;
  type: string;
  role: string;
  status: string;
  division?: string;
  divisionLabel?: string;
  divisionIcon?: string;
  divisionColor?: string;
  isClientFacing: boolean;
  isMasterAgent: boolean;
  channels: Record<string, boolean>;
  skills: { _id: string; name: string; category: string }[];
  tools: { _id: string; name: string; type: string }[];
  stats: {
    totalConversations: number;
    totalMessages: number;
    totalExecutions: number;
    satisfactionScore: number;
    conversionRate: number;
    lastActive?: string;
  };
  aiModel: string;
  version: number;
  createdAt: string;
}

interface AgentStats {
  total: number;
  active: number;
  inactive: number;
  draft: number;
  testing: number;
  clientFacing: number;
  masterAgent: number;
  divisions: number;
  divisionCounts: { _id: string; count: number; active: number }[];
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

const ROLE_ICONS: Record<string, typeof Bot> = {
  sales: Star, support: Zap, technical: Settings, marketing: BarChart3, operations: Activity, custom: Bot,
};

const STATUS_COLORS: Record<string, string> = {
  active: "bg-emerald-100 text-emerald-700",
  inactive: "bg-gray-100 text-gray-600",
  draft: "bg-amber-100 text-amber-700",
  testing: "bg-blue-100 text-blue-700",
};

const DIVISION_COLORS: Record<string, string> = {
  engineering: "bg-blue-100 text-blue-700",
  design: "bg-purple-100 text-purple-700",
  marketing: "bg-pink-100 text-pink-700",
  sales: "bg-green-100 text-green-700",
  support: "bg-amber-100 text-amber-700",
  finance: "bg-emerald-100 text-emerald-700",
  security: "bg-red-100 text-red-700",
  testing: "bg-orange-100 text-orange-700",
  specialized: "bg-indigo-100 text-indigo-700",
  "project-management": "bg-teal-100 text-teal-700",
  "game-development": "bg-rose-100 text-rose-700",
  gis: "bg-cyan-100 text-cyan-700",
  "paid-media": "bg-fuchsia-100 text-fuchsia-700",
  product: "bg-violet-100 text-violet-700",
  academic: "bg-sky-100 text-sky-700",
  healthcare: "bg-lime-100 text-lime-700",
  "spatial-computing": "bg-yellow-100 text-yellow-700",
};

export default function AgentsPage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [stats, setStats] = useState<AgentStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterRole, setFilterRole] = useState("all");
  const [filterDivision, setFilterDivision] = useState("all");
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 50, total: 0, pages: 0 });
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [expandedDivisions, setExpandedDivisions] = useState<Set<string>>(new Set());
  const [batchLoading, setBatchLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ success: boolean; message: string; created?: number; skipped?: number; errorDetails?: string[] } | null>(null);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importTab, setImportTab] = useState<"github" | "upload">("github");
  const [githubUrl, setGithubUrl] = useState("");
  const [uploadFiles, setUploadFiles] = useState<File[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const searchTimeout = useRef<NodeJS.Timeout | null>(null);

  // Debounce search
  useEffect(() => {
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => setDebouncedSearch(search), 300);
    return () => { if (searchTimeout.current) clearTimeout(searchTimeout.current); };
  }, [search]);

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch("/api/agents?statsOnly=true", { credentials: "include" });
      const data = await res.json();
      if (data.stats) setStats(data.stats);
    } catch { console.error("Failed to fetch stats"); }
  }, []);

  const fetchAgents = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("limit", "50");
      if (debouncedSearch) params.set("search", debouncedSearch);
      if (filterStatus !== "all") params.set("status", filterStatus);
      if (filterRole !== "all") params.set("role", filterRole);
      if (filterDivision !== "all") params.set("division", filterDivision);

      const res = await fetch(`/api/agents?${params}`, { credentials: "include" });
      const data = await res.json();
      setAgents(data.agents || []);
      if (data.pagination) setPagination(data.pagination);
    } catch { console.error("Failed to fetch agents"); } finally { setLoading(false); }
  }, [debouncedSearch, filterStatus, filterRole, filterDivision]);

  useEffect(() => { fetchStats(); }, [fetchStats]);
  useEffect(() => { fetchAgents(1); }, [fetchAgents]);

  const toggleStatus = async (agent: Agent) => {
    const newStatus = agent.status === "active" ? "inactive" : "active";
    try {
      await fetch(`/api/agents/${agent._id}`, {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      setAgents(agents.map((a) => a._id === agent._id ? { ...a, status: newStatus } : a));
    } catch { console.error("Failed to toggle status"); }
  };

  const deleteAgent = async (id: string) => {
    if (!confirm("Delete this agent?")) return;
    try {
      await fetch(`/api/agents/${id}`, { method: "DELETE" });
      setAgents(agents.filter((a) => a._id !== id));
      fetchStats();
    } catch { console.error("Failed to delete agent"); }
  };

  const handleBatch = async (action: "activate" | "deactivate" | "delete") => {
    if (selectedIds.size === 0) return;
    if (action === "delete" && !confirm(`Delete ${selectedIds.size} agents?`)) return;
    setBatchLoading(true);
    try {
      await fetch("/api/agents/batch", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, agentIds: Array.from(selectedIds) }),
      });
      setSelectedIds(new Set());
      fetchAgents(pagination.page);
      fetchStats();
    } catch { console.error("Batch operation failed"); } finally { setBatchLoading(false); }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === agents.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(agents.map((a) => a._id)));
    }
  };

  const importAgents = async (dryRun = false) => {
    setImporting(true);
    setImportResult(null);
    try {
      let res: Response;

      if (importTab === "github" && githubUrl) {
        res = await fetch("/api/agents/import", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ source: "github", repoUrl: githubUrl, dryRun }),
        });
      } else if (importTab === "upload" && uploadFiles.length > 0) {
        const formData = new FormData();
        formData.set("dryRun", String(dryRun));
        for (const file of uploadFiles) formData.append("files", file);
        res = await fetch("/api/agents/import", {
          method: "POST",
          credentials: "include",
          body: formData,
        });
      } else {
        setImportResult({ success: false, message: "Please provide a source" });
        setImporting(false);
        return;
      }

      const data = await res.json();
      if (data.success) {
        const src = data.source === "github" ? "GitHub" : "Upload";
        const msg = dryRun
          ? `[${src}] Dry run: ${data.summary.totalFound} agents found, ${data.summary.created} would be created`
          : `[${src}] Imported ${data.summary.created} agents, ${data.summary.skipped} skipped, ${data.summary.errors} errors`;
        setImportResult({ success: true, message: msg, created: data.summary.created, skipped: data.summary.skipped, errorDetails: data.errorDetails });
        if (!dryRun) { fetchAgents(1); fetchStats(); }
      } else {
        setImportResult({ success: false, message: data.error || "Import failed" });
      }
    } catch {
      setImportResult({ success: false, message: "Network error during import" });
    } finally {
      setImporting(false);
    }
  };

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    const files = Array.from(e.dataTransfer.files).filter((f) => f.name.endsWith(".md"));
    if (files.length > 0) setUploadFiles(files);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) setUploadFiles(Array.from(e.target.files));
  };

  const toggleDivision = (div: string) => {
    setExpandedDivisions((prev) => {
      const next = new Set(prev);
      if (next.has(div)) next.delete(div); else next.add(div);
      return next;
    });
  };

  // Group agents by division for list view
  const groupedAgents = stats?.divisionCounts?.reduce((acc, dc) => {
    const div = dc._id || "unassigned";
    if (!acc[div]) acc[div] = [];
    acc[div] = agents.filter((a) => (a.division || "unassigned") === div);
    return acc;
  }, {} as Record<string, Agent[]>) || {};

  const divisions = Object.keys(groupedAgents).sort();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">AI Agent Workforce</h1>
          <p className="text-sm text-muted-foreground">{pagination.total} agents across {stats?.divisions || 0} divisions</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => { fetchAgents(pagination.page); fetchStats(); }}
            className="p-2 border rounded-lg hover:bg-accent"><RefreshCw className="h-4 w-4" /></button>
          <button onClick={() => setShowImportModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 text-sm">
            <Bot className="h-4 w-4" />Import Agents
          </button>
          <Link href="/dashboard/agents/new"
            className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:bg-primary/90 text-sm">
            <Plus className="h-4 w-4" />New Agent
          </Link>
        </div>
      </div>

      {/* Import Result Banner */}
      {importResult && (
        <div className={cn("rounded-xl border p-4 flex items-center justify-between",
          importResult.success ? "bg-emerald-50 border-emerald-200" : "bg-red-50 border-red-200")}>
          <div className="flex items-center gap-3">
            {importResult.success ? (
              <Bot className="h-5 w-5 text-emerald-600" />
            ) : (
              <span className="text-red-600 font-bold">!</span>
            )}
            <p className={cn("text-sm", importResult.success ? "text-emerald-700" : "text-red-700")}>
              {importResult.message}
            </p>
          </div>
          <button onClick={() => setImportResult(null)} className="text-muted-foreground hover:text-foreground text-sm">Dismiss</button>
        </div>
      )}

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {[
            { label: "Total", value: stats.total, icon: Bot, color: "text-violet-600", bg: "bg-violet-50" },
            { label: "Active", value: stats.active, icon: Activity, color: "text-emerald-600", bg: "bg-emerald-50" },
            { label: "Inactive", value: stats.inactive, icon: Pause, color: "text-gray-600", bg: "bg-gray-50" },
            { label: "Client Facing", value: stats.clientFacing, icon: Users, color: "text-blue-600", bg: "bg-blue-50" },
            { label: "Divisions", value: stats.divisions, icon: Globe, color: "text-amber-600", bg: "bg-amber-50" },
          ].map((s) => (
            <div key={s.label} className="bg-white rounded-xl border p-3">
              <div className="flex items-center gap-2">
                <div className={cn("p-1.5 rounded-lg", s.bg)}><s.icon className={cn("h-4 w-4", s.color)} /></div>
                <div><p className="text-xs text-muted-foreground">{s.label}</p><p className="text-lg font-bold">{s.value}</p></div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Division Quick Filters */}
      {stats?.divisionCounts && stats.divisionCounts.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <button onClick={() => setFilterDivision("all")}
            className={cn("px-3 py-1.5 text-xs rounded-full border transition-colors",
              filterDivision === "all" ? "bg-primary text-primary-foreground" : "bg-white hover:bg-muted")}>
            All ({stats.total})
          </button>
          {stats.divisionCounts.map((dc) => (
            <button key={dc._id} onClick={() => setFilterDivision(dc._id)}
              className={cn("px-3 py-1.5 text-xs rounded-full border transition-colors",
                filterDivision === dc._id ? "bg-primary text-primary-foreground" : "bg-white hover:bg-muted")}>
              {dc._id || "Other"} ({dc.count})
            </button>
          ))}
        </div>
      )}

      {/* Filters & Controls */}
      <div className="bg-white rounded-xl border p-4">
        <div className="flex flex-col md:flex-row items-start md:items-center gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input type="text" placeholder="Search agents..." value={search} onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-lg border bg-muted/50 pl-9 pr-4 py-2 text-sm" />
          </div>
          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}
            className="rounded-lg border bg-background px-3 py-2 text-sm">
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="draft">Draft</option>
            <option value="testing">Testing</option>
          </select>
          <select value={filterRole} onChange={(e) => setFilterRole(e.target.value)}
            className="rounded-lg border bg-background px-3 py-2 text-sm">
            <option value="all">All Roles</option>
            <option value="sales">Sales</option>
            <option value="support">Support</option>
            <option value="technical">Technical</option>
            <option value="marketing">Marketing</option>
            <option value="operations">Operations</option>
            <option value="custom">Custom</option>
          </select>
          <div className="flex items-center gap-1 border rounded-lg">
            <button onClick={() => setViewMode("grid")} className={cn("p-2", viewMode === "grid" && "bg-muted")}>
              <LayoutGrid className="h-4 w-4" /></button>
            <button onClick={() => setViewMode("list")} className={cn("p-2", viewMode === "list" && "bg-muted")}>
              <List className="h-4 w-4" /></button>
          </div>
        </div>

        {/* Batch Operations */}
        {selectedIds.size > 0 && (
          <div className="flex items-center gap-3 mt-3 pt-3 border-t">
            <span className="text-sm text-muted-foreground">{selectedIds.size} selected</span>
            <button onClick={toggleSelectAll} className="text-xs text-primary hover:underline">Select all ({pagination.total})</button>
            <div className="flex-1" />
            <button disabled={batchLoading} onClick={() => handleBatch("activate")}
              className="px-3 py-1.5 text-xs bg-green-100 text-green-700 rounded-lg hover:bg-green-200 disabled:opacity-50">
              {batchLoading ? <Loader2 className="h-3 w-3 animate-spin inline" /> : "Activate"}
            </button>
            <button disabled={batchLoading} onClick={() => handleBatch("deactivate")}
              className="px-3 py-1.5 text-xs bg-amber-100 text-amber-700 rounded-lg hover:bg-amber-200 disabled:opacity-50">
              Deactivate
            </button>
            <button disabled={batchLoading} onClick={() => handleBatch("delete")}
              className="px-3 py-1.5 text-xs bg-red-100 text-red-700 rounded-lg hover:bg-red-200 disabled:opacity-50">
              Delete
            </button>
          </div>
        )}
      </div>

      {/* Agent List */}
      {loading ? (
        <div className="flex items-center justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      ) : agents.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border">
          <Bot className="h-12 w-12 text-muted-foreground mx-auto mb-3 opacity-50" />
          <p className="text-muted-foreground">No agents found</p>
          <Link href="/dashboard/agents/new" className="mt-3 inline-flex items-center gap-1 text-primary hover:underline text-sm">
            <Plus className="h-4 w-4" />Create agent
          </Link>
        </div>
      ) : viewMode === "grid" ? (
        /* Grid View */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {agents.map((agent) => {
            const RoleIcon = ROLE_ICONS[agent.role] || Bot;
            return (
              <div key={agent._id} className="bg-white rounded-xl border p-4 hover:shadow-md transition-shadow relative">
                <button onClick={() => toggleSelect(agent._id)} className="absolute top-3 right-3">
                  {selectedIds.has(agent._id)
                    ? <CheckSquare className="h-4 w-4 text-primary" />
                    : <Square className="h-4 w-4 text-muted-foreground" />}
                </button>
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <RoleIcon className="h-5 w-5 text-primary" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-sm font-semibold truncate">{agent.name}</h3>
                    <p className="text-xs text-muted-foreground truncate">{agent.description || "No description"}</p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1 mb-3">
                  <span className={cn("text-xs px-2 py-0.5 rounded", STATUS_COLORS[agent.status])}>{agent.status}</span>
                  {agent.division && (
                    <span className={cn("text-xs px-2 py-0.5 rounded", DIVISION_COLORS[agent.division] || "bg-gray-100 text-gray-600")}>
                      {agent.divisionLabel || agent.division}
                    </span>
                  )}
                  {agent.isMasterAgent && <span className="text-xs px-2 py-0.5 rounded bg-amber-100 text-amber-700">Master</span>}
                  {agent.isClientFacing && <span className="text-xs px-2 py-0.5 rounded bg-blue-100 text-blue-700">Client</span>}
                </div>
                <div className="flex items-center gap-3 text-xs text-muted-foreground mb-3">
                  <span className="flex items-center gap-1"><MessageSquare className="h-3 w-3" />{agent.stats?.totalConversations || 0}</span>
                  <span className="flex items-center gap-1"><Zap className="h-3 w-3" />{agent.skills?.length || 0}</span>
                  <span className="flex items-center gap-1"><Settings className="h-3 w-3" />{agent.tools?.length || 0}</span>
                  <span className="text-xs ml-auto">v{agent.version}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Link href={`/dashboard/agents/${agent._id}`} className="flex-1 text-center px-2 py-1.5 text-xs bg-muted rounded-lg hover:bg-muted/80">Details</Link>
                  <Link href={`/dashboard/agents/${agent._id}/test`} className="flex-1 text-center px-2 py-1.5 text-xs bg-primary/10 text-primary rounded-lg hover:bg-primary/20">Test</Link>
                  <button onClick={() => toggleStatus(agent)} className="px-2 py-1.5 text-xs border rounded-lg hover:bg-muted">
                    {agent.status === "active" ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
                  </button>
                  <button onClick={() => deleteAgent(agent._id)} className="px-2 py-1.5 text-xs text-destructive border border-destructive/20 rounded-lg hover:bg-destructive/10">
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* List View — Grouped by Division */
        <div className="space-y-2">
          {divisions.map((div) => {
            const isExpanded = expandedDivisions.has(div);
            const divAgents = groupedAgents[div] || [];
            const dc = stats?.divisionCounts?.find((d) => d._id === div);
            return (
              <div key={div} className="bg-white rounded-xl border overflow-hidden">
                <button onClick={() => toggleDivision(div)}
                  className="w-full flex items-center gap-3 p-4 hover:bg-muted/30 transition-colors">
                  <ChevronRight className={cn("h-4 w-4 transition-transform", isExpanded && "rotate-90")} />
                  <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold",
                    DIVISION_COLORS[div]?.replace("text-", "bg-").replace("-700", "-100") || "bg-gray-100")}>
                    {div.charAt(0).toUpperCase()}
                  </div>
                  <div className="text-left flex-1">
                    <p className="text-sm font-semibold capitalize">{div.replace(/-/g, " ")}</p>
                    <p className="text-xs text-muted-foreground">{dc?.count || 0} agents, {dc?.active || 0} active</p>
                  </div>
                  <span className="text-xs text-muted-foreground">{divAgents.length} loaded</span>
                </button>
                {isExpanded && (
                  <div className="border-t divide-y">
                    {divAgents.map((agent) => (
                      <div key={agent._id} className="flex items-center gap-4 px-4 py-3 hover:bg-muted/30">
                        <button onClick={() => toggleSelect(agent._id)}>
                          {selectedIds.has(agent._id)
                            ? <CheckSquare className="h-4 w-4 text-primary" />
                            : <Square className="h-4 w-4 text-muted-foreground" />}
                        </button>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium truncate">{agent.name}</p>
                            <span className={cn("text-xs px-2 py-0.5 rounded", STATUS_COLORS[agent.status])}>{agent.status}</span>
                          </div>
                          <p className="text-xs text-muted-foreground truncate">{agent.description}</p>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground shrink-0">
                          <span>{agent.stats?.totalConversations || 0} convos</span>
                          <span>{agent.skills?.length || 0} skills</span>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <Link href={`/dashboard/agents/${agent._id}`} className="px-2 py-1 text-xs bg-muted rounded hover:bg-muted/80">Details</Link>
                          <Link href={`/dashboard/agents/${agent._id}/test`} className="px-2 py-1 text-xs bg-primary/10 text-primary rounded hover:bg-primary/20">Test</Link>
                          <button onClick={() => toggleStatus(agent)} className="px-2 py-1 text-xs border rounded hover:bg-muted">
                            {agent.status === "active" ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {pagination.pages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button disabled={pagination.page <= 1} onClick={() => fetchAgents(pagination.page - 1)}
            className="px-3 py-1.5 text-sm border rounded-lg disabled:opacity-50 hover:bg-muted">Previous</button>
          <span className="text-sm text-muted-foreground">Page {pagination.page} of {pagination.pages} ({pagination.total} agents)</span>
          <button disabled={pagination.page >= pagination.pages} onClick={() => fetchAgents(pagination.page + 1)}
            className="px-3 py-1.5 text-sm border rounded-lg disabled:opacity-50 hover:bg-muted">Next</button>
        </div>
      )}

      {/* Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => !importing && setShowImportModal(false)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg mx-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b">
              <div>
                <h2 className="text-lg font-bold">Import Agents</h2>
                <p className="text-sm text-muted-foreground">Import AI agents from a source into your workforce</p>
              </div>
              <button onClick={() => !importing && setShowImportModal(false)} className="p-1 hover:bg-muted rounded-lg">
                <XCircle className="h-5 w-5" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {/* Tab Switcher */}
              <div className="flex gap-1 bg-muted rounded-lg p-1">
                <button onClick={() => setImportTab("github")}
                  className={cn("flex-1 py-2 text-sm font-medium rounded-md transition-colors",
                    importTab === "github" ? "bg-white shadow-sm text-foreground" : "text-muted-foreground")}>
                  <Globe className="h-4 w-4 inline mr-1.5" />GitHub Repository
                </button>
                <button onClick={() => setImportTab("upload")}
                  className={cn("flex-1 py-2 text-sm font-medium rounded-md transition-colors",
                    importTab === "upload" ? "bg-white shadow-sm text-foreground" : "text-muted-foreground")}>
                  <Plus className="h-4 w-4 inline mr-1.5" />Upload Files
                </button>
              </div>

              {/* GitHub Tab */}
              {importTab === "github" && (
                <div className="space-y-3">
                  <div>
                    <label className="text-sm font-medium">Repository URL</label>
                    <input type="url" value={githubUrl} onChange={(e) => setGithubUrl(e.target.value)}
                      placeholder="https://github.com/owner/agency-agents"
                      className="w-full mt-1 rounded-lg border bg-muted/50 px-3 py-2 text-sm" />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Paste a GitHub repository URL containing .md agent files with YAML frontmatter.
                    The importer will scan all directories for files with <code>name</code> in frontmatter.
                  </p>
                </div>
              )}

              {/* Upload Tab */}
              {importTab === "upload" && (
                <div className="space-y-3">
                  <div
                    onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
                    onDragLeave={() => setDragActive(false)}
                    onDrop={handleFileDrop}
                    className={cn("border-2 border-dashed rounded-xl p-8 text-center transition-colors cursor-pointer",
                      dragActive ? "border-primary bg-primary/5" : "border-muted-foreground/25 hover:border-muted-foreground/50")}
                    onClick={() => document.getElementById("agent-file-input")?.click()}>
                    <Bot className="h-10 w-10 text-muted-foreground mx-auto mb-3 opacity-50" />
                    <p className="text-sm font-medium">
                      {uploadFiles.length > 0 ? `${uploadFiles.length} files selected` : "Drop .md files here or click to browse"}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">Supports .md files with YAML frontmatter</p>
                    <input id="agent-file-input" type="file" multiple accept=".md" className="hidden" onChange={handleFileSelect} />
                  </div>
                  {uploadFiles.length > 0 && (
                    <div className="space-y-1 max-h-32 overflow-y-auto">
                      {uploadFiles.map((f, i) => (
                        <div key={i} className="flex items-center gap-2 text-xs bg-muted/50 rounded-lg px-3 py-1.5">
                          <Zap className="h-3 w-3 text-primary" />
                          <span className="flex-1 truncate">{f.name}</span>
                          <button onClick={() => setUploadFiles(uploadFiles.filter((_, idx) => idx !== i))} className="text-muted-foreground hover:text-foreground">
                            <XCircle className="h-3 w-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Import Result */}
              {importResult && (
                <div className={cn("rounded-xl border p-3 text-sm",
                  importResult.success ? "bg-emerald-50 border-emerald-200 text-emerald-700" : "bg-red-50 border-red-200 text-red-700")}>
                  <p>{importResult.message}</p>
                  {importResult.errorDetails && importResult.errorDetails.length > 0 && (
                    <div className="mt-2 text-xs space-y-1">
                      {importResult.errorDetails.map((e, i) => <p key={i} className="opacity-70">• {e}</p>)}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="flex items-center justify-between p-5 border-t">
              <button onClick={() => importAgents(true)} disabled={importing || (importTab === "github" && !githubUrl) || (importTab === "upload" && uploadFiles.length === 0)}
                className="px-4 py-2 text-sm border rounded-lg hover:bg-muted disabled:opacity-50">
                {importing ? <Loader2 className="h-4 w-4 animate-spin inline mr-1" /> : null}
                Dry Run
              </button>
              <div className="flex gap-2">
                <button onClick={() => !importing && setShowImportModal(false)} className="px-4 py-2 text-sm border rounded-lg hover:bg-muted">Cancel</button>
                <button onClick={() => importAgents(false)} disabled={importing || (importTab === "github" && !githubUrl) || (importTab === "upload" && uploadFiles.length === 0)}
                  className="px-4 py-2 text-sm bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50">
                  {importing ? <Loader2 className="h-4 w-4 animate-spin inline mr-1" /> : null}
                  Import
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
