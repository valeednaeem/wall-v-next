"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Loader2, FolderOpen, Clock, CheckCircle2, AlertCircle,
  DollarSign, Users, Calendar, ArrowRight, BarChart3
} from "lucide-react";

interface Project {
  _id: string;
  name: string;
  status: string;
  priority: string;
  progress: number;
  budget: number;
  spent: number;
  currency: string;
  deadline?: string;
  client: { name: string; email: string };
  milestones: {
    name: string;
    status: string;
    amount?: number;
    dueDate?: string;
  }[];
  projectManager?: string;
  team: { user: string; role: string }[];
  updates?: { title: string; createdAt: Date }[];
  createdAt: string;
}

interface Stats {
  total: number;
  active: number;
  review: number;
  completed: number;
  overdue: number;
  pendingPayment: number;
}

export default function ProjectManagerDashboard() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<Stats>({
    total: 0, active: 0, review: 0, completed: 0, overdue: 0, pendingPayment: 0,
  });

  const fetchProjects = useCallback(async () => {
    try {
      const res = await fetch("/api/projects?limit=100");
      const data = await res.json();
      const allProjects = data.projects || data.data || [];
      setProjects(allProjects);

      const now = new Date();
      setStats({
        total: allProjects.length,
        active: allProjects.filter((p: Project) => p.status === "in-progress").length,
        review: allProjects.filter((p: Project) => p.status === "review").length,
        completed: allProjects.filter((p: Project) => p.status === "completed").length,
        overdue: allProjects.filter((p: Project) =>
          p.deadline && new Date(p.deadline) < now && p.status !== "completed"
        ).length,
        pendingPayment: allProjects.filter((p: Project) => p.status === "pending-payment").length,
      });
    } catch {
      console.error("Failed to load projects");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchProjects(); }, [fetchProjects]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed": return "bg-green-50 text-green-700 border-green-200";
      case "in-progress": return "bg-blue-50 text-blue-700 border-blue-200";
      case "review": return "bg-yellow-50 text-yellow-700 border-yellow-200";
      case "pending-payment": return "bg-orange-50 text-orange-700 border-orange-200";
      case "on-hold": return "bg-gray-50 text-gray-700 border-gray-200";
      case "cancelled": return "bg-red-50 text-red-700 border-red-200";
      default: return "bg-gray-50 text-gray-500 border-gray-200";
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "urgent": return "text-red-600";
      case "high": return "text-orange-600";
      case "medium": return "text-yellow-600";
      default: return "text-gray-500";
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Project Manager Dashboard</h1>
        <p className="text-sm text-muted-foreground">Overview of all projects and their status</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {[
          { label: "Total Projects", value: stats.total, icon: FolderOpen, color: "text-blue-600" },
          { label: "Active", value: stats.active, icon: Clock, color: "text-green-600" },
          { label: "In Review", value: stats.review, icon: AlertCircle, color: "text-yellow-600" },
          { label: "Completed", value: stats.completed, icon: CheckCircle2, color: "text-green-600" },
          { label: "Overdue", value: stats.overdue, icon: AlertCircle, color: "text-red-600" },
          { label: "Pending Payment", value: stats.pendingPayment, icon: DollarSign, color: "text-orange-600" },
        ].map((stat) => (
          <div key={stat.label} className="rounded-lg border p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-muted-foreground">{stat.label}</span>
              <stat.icon className={`h-4 w-4 ${stat.color}`} />
            </div>
            <p className="text-2xl font-bold">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Projects Table */}
      <div className="rounded-lg border">
        <div className="px-4 py-3 border-b bg-muted/30">
          <h2 className="font-semibold">All Projects</h2>
        </div>
        <div className="divide-y">
          {projects.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              No projects found.
            </div>
          ) : (
            projects.map((project) => {
              const completedMilestones = project.milestones.filter(
                (m) => m.status === "completed" || m.status === "approved"
              ).length;
              const currentMilestone = project.milestones.find(
                (m) => m.status === "in-progress" || m.status === "generated" || m.status === "review"
              );
              const isOverdue = project.deadline && new Date(project.deadline) < new Date() && project.status !== "completed";

              return (
                <div key={project._id} className="p-4 hover:bg-muted/20 transition-colors">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Link
                          href={`/dashboard/projects/${project._id}/edit`}
                          className="font-medium hover:underline truncate"
                        >
                          {project.name}
                        </Link>
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(project.status)}`}>
                          {project.status.replace(/-/g, " ")}
                        </span>
                        {isOverdue && (
                          <span className="text-xs text-red-600 font-medium">Overdue</span>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mt-0.5">
                        {typeof project.client === "object" ? project.client.name : "Client"}
                      </p>

                      {/* Progress */}
                      <div className="flex items-center gap-3 mt-2">
                        <div className="flex-1 max-w-xs">
                          <div className="flex justify-between text-xs mb-0.5">
                            <span className="text-muted-foreground">Progress</span>
                            <span>{project.progress}%</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-1.5">
                            <div
                              className="bg-primary rounded-full h-1.5 transition-all"
                              style={{ width: `${project.progress}%` }}
                            />
                          </div>
                        </div>
                        <span className={`text-xs font-medium ${getPriorityColor(project.priority)}`}>
                          {project.priority}
                        </span>
                      </div>

                      {/* Milestones */}
                      <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                        <span>
                          Milestones: {completedMilestones}/{project.milestones.length}
                        </span>
                        {currentMilestone && (
                          <span className="text-blue-600">
                            Current: {currentMilestone.name}
                          </span>
                        )}
                        {project.budget > 0 && (
                          <span className="flex items-center gap-1">
                            <DollarSign className="h-3 w-3" />
                            {project.budget.toLocaleString()}
                          </span>
                        )}
                        {project.deadline && (
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {new Date(project.deadline).toLocaleDateString()}
                          </span>
                        )}
                      </div>

                      {/* Last Update */}
                      {project.updates && project.updates.length > 0 && (
                        <p className="text-xs text-muted-foreground mt-1.5">
                          Last update: {project.updates[project.updates.length - 1].title}
                        </p>
                      )}
                    </div>

                    <Link
                      href={`/dashboard/projects/${project._id}/edit`}
                      className="flex items-center gap-1 text-sm text-primary hover:underline flex-shrink-0"
                    >
                      Manage
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
