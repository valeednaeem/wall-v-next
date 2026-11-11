"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { FolderKanban, Clock, Search, Filter } from "lucide-react";
import { cn } from "@/lib/utils";

interface Milestone {
  name: string;
  status: string;
  dueDate?: string;
}

interface Project {
  _id: string;
  name: string;
  description: string;
  status: string;
  progress: number;
  priority: string;
  projectType: string;
  deadline?: string;
  paymentStatus: string;
  milestones: { total: number; completed: number; list: Milestone[] };
  latestUpdate?: { title: string; description: string; createdAt: string };
  createdAt: string;
}

const STATUS_FILTERS = ["all", "planning", "in-progress", "review", "testing", "completed", "on-hold"];

const statusColor: Record<string, string> = {
  "new": "bg-gray-100 text-gray-700",
  "planning": "bg-blue-100 text-blue-700",
  "in-progress": "bg-emerald-100 text-emerald-700",
  "review": "bg-amber-100 text-amber-700",
  "testing": "bg-purple-100 text-purple-700",
  "completed": "bg-green-100 text-green-700",
  "on-hold": "bg-orange-100 text-orange-700",
  "cancelled": "bg-red-100 text-red-700",
};

const priorityColor: Record<string, string> = {
  low: "bg-gray-100 text-gray-600",
  medium: "bg-blue-100 text-blue-600",
  high: "bg-orange-100 text-orange-600",
  urgent: "bg-red-100 text-red-600",
};

export default function ClientProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");

  useEffect(() => {
    const url = filter === "all" ? "/api/client/projects" : `/api/client/projects?status=${filter}`;
    fetch(url, { credentials: "include" })
      .then((r) => r.json())
      .then((data) => { setProjects(data.projects || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [filter]);

  const filtered = projects.filter((p) =>
    !search || p.name.toLowerCase().includes(search.toLowerCase()) || p.description?.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" /></div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">My Projects</h1>
        <p className="text-muted-foreground">Track progress, view milestones, and review deliverables.</p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search projects..."
            className="w-full rounded-lg border bg-white pl-9 pr-4 py-2 text-sm" />
        </div>
        <div className="flex gap-1 overflow-x-auto">
          {STATUS_FILTERS.map((s) => (
            <button key={s} onClick={() => setFilter(s)}
              className={cn("px-3 py-1.5 text-xs rounded-full border whitespace-nowrap",
                filter === s ? "bg-primary text-primary-foreground" : "bg-white hover:bg-muted")}>
              {s === "all" ? "All" : s.charAt(0).toUpperCase() + s.slice(1).replace("-", " ")}
            </button>
          ))}
        </div>
      </div>

      {/* Project List */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-xl border p-12 text-center">
          <FolderKanban className="h-16 w-16 mx-auto mb-4 opacity-20" />
          <p className="text-muted-foreground">No projects found.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((project) => (
            <Link key={project._id} href={`/client/projects/${project._id}`}
              className="block bg-white rounded-xl border p-5 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold truncate">{project.name}</h3>
                    <span className={cn("px-2 py-0.5 text-xs rounded-full shrink-0", statusColor[project.status] || "bg-gray-100")}>
                      {project.status.replace("-", " ")}
                    </span>
                    <span className={cn("px-2 py-0.5 text-xs rounded-full shrink-0", priorityColor[project.priority] || "")}>
                      {project.priority}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{project.description}</p>

                  {/* Progress Bar */}
                  <div className="flex items-center gap-3">
                    <div className="flex-1 bg-gray-200 rounded-full h-2.5">
                      <div className="bg-primary h-2.5 rounded-full transition-all" style={{ width: `${project.progress}%` }} />
                    </div>
                    <span className="text-sm font-medium shrink-0">{project.progress}%</span>
                  </div>

                  {/* Milestones */}
                  {project.milestones.total > 0 && (
                    <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
                      <span>{project.milestones.completed}/{project.milestones.total} milestones</span>
                      {project.deadline && (
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" /> Due {new Date(project.deadline).toLocaleDateString()}
                        </span>
                      )}
                      {project.paymentStatus && (
                        <span className={cn("px-2 py-0.5 rounded-full",
                          project.paymentStatus === "paid" ? "bg-green-100 text-green-700" :
                          project.paymentStatus === "partial" ? "bg-yellow-100 text-yellow-700" :
                          "bg-red-100 text-red-700"
                        )}>
                          {project.paymentStatus}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Latest Update */}
                  {project.latestUpdate && (
                    <div className="mt-3 p-2 bg-gray-50 rounded-lg text-xs">
                      <span className="font-medium">Latest: </span>
                      <span className="text-muted-foreground">{project.latestUpdate.title}</span>
                      <span className="text-muted-foreground ml-1">
                        ({new Date(project.latestUpdate.createdAt).toLocaleDateString()})
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
