"use client";

import Link from "next/link";
import { useState, useEffect, useCallback } from "react";
import {
  Plus, Search, FolderKanban, Loader2, Eye, Pencil, Trash2,
  Clock, CheckCircle2, AlertCircle, Pause, XCircle
} from "lucide-react";

interface Project {
  _id: string;
  name: string;
  slug: string;
  title?: string;
  description: string;
  status: string;
  priority: string;
  budget: number;
  spent: number;
  currency: string;
  progress: number;
  startDate?: string;
  deadline?: string;
  milestones: { name: string; status: string }[];
  client: { name?: string; email?: string } | string;
  createdAt: string;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  planning: { label: "Planning", color: "bg-blue-50 text-blue-700", icon: <Clock className="h-3 w-3" /> },
  "in-progress": { label: "In Progress", color: "bg-yellow-50 text-yellow-700", icon: <Clock className="h-3 w-3" /> },
  review: { label: "Review", color: "bg-purple-50 text-purple-700", icon: <Eye className="h-3 w-3" /> },
  testing: { label: "Testing", color: "bg-orange-50 text-orange-700", icon: <AlertCircle className="h-3 w-3" /> },
  completed: { label: "Completed", color: "bg-green-50 text-green-700", icon: <CheckCircle2 className="h-3 w-3" /> },
  "on-hold": { label: "On Hold", color: "bg-gray-50 text-gray-700", icon: <Pause className="h-3 w-3" /> },
  cancelled: { label: "Cancelled", color: "bg-red-50 text-red-700", icon: <XCircle className="h-3 w-3" /> },
  demo: { label: "Demo", color: "bg-indigo-50 text-indigo-700", icon: <Eye className="h-3 w-3" /> },
  "pending-payment": { label: "Pending Payment", color: "bg-amber-50 text-amber-700", icon: <AlertCircle className="h-3 w-3" /> },
};

const PRIORITY_COLORS: Record<string, string> = {
  low: "bg-gray-100 text-gray-600",
  medium: "bg-blue-100 text-blue-600",
  high: "bg-orange-100 text-orange-600",
  urgent: "bg-red-100 text-red-600",
};

export default function ProjectsDashboardPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [total, setTotal] = useState(0);

  const fetchProjects = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (search) params.set("search", search);
      const res = await fetch(`/api/projects?${params}`);
      const data = await res.json();
      setProjects(data.projects || []);
      setTotal(data.total || 0);
    } catch {
      console.error("Failed to load projects");
    } finally {
      setLoading(false);
    }
  }, [statusFilter, search]);

  useEffect(() => { fetchProjects(); }, [fetchProjects]);

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this project?")) return;
    await fetch(`/api/projects/${id}`, { method: "DELETE" });
    await fetchProjects();
  };

  const formatPrice = (amount: number, currency: string = "USD") =>
    new Intl.NumberFormat("en-US", { style: "currency", currency, maximumFractionDigits: 0 }).format(amount);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Projects</h1>
          <p className="text-sm text-muted-foreground mt-1">{total} project{total !== 1 ? "s" : ""} total</p>
        </div>
        <Link
          href="/dashboard/projects/new"
          className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" /> New Project
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {["planning", "in-progress", "review", "completed", "demo"].map((s) => {
          const cfg = STATUS_CONFIG[s];
          const count = projects.filter((p) => p.status === s).length;
          return (
            <button
              key={s}
              onClick={() => setStatusFilter(statusFilter === s ? "all" : s)}
              className={`rounded-lg border p-3 text-left transition-colors ${statusFilter === s ? "ring-2 ring-primary" : ""}`}
            >
              <div className="flex items-center gap-1.5">
                {cfg.icon}
                <span className="text-xs font-medium">{cfg.label}</span>
              </div>
              <p className="text-xl font-bold mt-1">{count}</p>
            </button>
          );
        })}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search projects..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border bg-muted/50 pl-9 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-lg border bg-background px-3 py-2 text-sm"
        >
          <option value="all">All Status</option>
          {Object.entries(STATUS_CONFIG).map(([k, v]) => (
            <option key={k} value={k}>{v.label}</option>
          ))}
        </select>
      </div>

      {/* Projects Table */}
      <div className="rounded-lg border overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : projects.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            <FolderKanban className="h-12 w-12 mx-auto mb-3 text-muted-foreground/50" />
            <p>No projects found. Create your first project to get started.</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left p-3 font-medium">Project</th>
                <th className="text-left p-3 font-medium">Client</th>
                <th className="text-left p-3 font-medium">Status</th>
                <th className="text-left p-3 font-medium">Priority</th>
                <th className="text-left p-3 font-medium">Progress</th>
                <th className="text-left p-3 font-medium">Budget</th>
                <th className="text-left p-3 font-medium">Milestones</th>
                <th className="text-right p-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {projects.map((project) => {
                const statusCfg = STATUS_CONFIG[project.status] || STATUS_CONFIG.planning;
                const clientName = typeof project.client === "object"
                  ? project.client.name || project.client.email || "—"
                  : project.client || "—";
                const completedMilestones = project.milestones?.filter((m) => m.status === "completed").length || 0;
                const totalMilestones = project.milestones?.length || 0;

                return (
                  <tr key={project._id} className="border-t hover:bg-muted/30">
                    <td className="p-3">
                      <div>
                        <p className="font-medium">{project.name}</p>
                        <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                          {project.title || project.description}
                        </p>
                      </div>
                    </td>
                    <td className="p-3 text-xs">{clientName}</td>
                    <td className="p-3">
                      <span className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium ${statusCfg.color}`}>
                        {statusCfg.icon}
                        {statusCfg.label}
                      </span>
                    </td>
                    <td className="p-3">
                      <span className={`inline-flex rounded-md px-2 py-0.5 text-xs font-medium ${PRIORITY_COLORS[project.priority] || PRIORITY_COLORS.medium}`}>
                        {project.priority}
                      </span>
                    </td>
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary rounded-full"
                            style={{ width: `${project.progress}%` }}
                          />
                        </div>
                        <span className="text-xs text-muted-foreground">{project.progress}%</span>
                      </div>
                    </td>
                    <td className="p-3 text-xs font-medium">
                      {project.budget > 0 ? formatPrice(project.budget, project.currency) : "—"}
                    </td>
                    <td className="p-3 text-xs">
                      {totalMilestones > 0 ? `${completedMilestones}/${totalMilestones}` : "—"}
                    </td>
                    <td className="p-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Link
                          href={`/preview/${project._id}`}
                          target="_blank"
                          className="p-1.5 rounded-lg hover:bg-accent text-muted-foreground"
                        >
                          <Eye className="h-4 w-4" />
                        </Link>
                        <Link
                          href={`/dashboard/projects/${project._id}/edit`}
                          className="p-1.5 rounded-lg hover:bg-accent text-muted-foreground"
                        >
                          <Pencil className="h-4 w-4" />
                        </Link>
                        <button
                          onClick={() => handleDelete(project._id)}
                          className="p-1.5 rounded-lg hover:bg-destructive/10 text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
