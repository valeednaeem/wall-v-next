"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { FolderKanban, FileText, CreditCard, Clock, ArrowRight, TrendingUp } from "lucide-react";

interface Project {
  _id: string;
  name: string;
  status: string;
  progress: number;
  deadline?: string;
  milestones: { total: number; completed: number };
}

interface Stats {
  totalProjects: number;
  activeProjects: number;
  completedProjects: number;
  pendingInvoices: number;
  totalPaid: number;
}

export default function ClientDashboardPage() {
  const [stats, setStats] = useState<Stats>({ totalProjects: 0, activeProjects: 0, completedProjects: 0, pendingInvoices: 0, totalPaid: 0 });
  const [recentProjects, setRecentProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/client/projects?limit=50", { credentials: "include" }).then((r) => r.json()),
      fetch("/api/client/invoices?limit=50", { credentials: "include" }).then((r) => r.json()),
      fetch("/api/client/payments?limit=1", { credentials: "include" }).then((r) => r.json()),
    ]).then(([projectsData, invoicesData, paymentsData]) => {
      const projects = projectsData.projects || [];
      const active = projects.filter((p: Project) => ["planning", "in-progress", "review", "testing", "new"].includes(p.status)).length;
      const completed = projects.filter((p: Project) => p.status === "completed").length;
      const pendingInvoices = (invoicesData.invoices || []).filter((i: { status: string }) => ["draft", "sent", "viewed", "partially-paid", "overdue"].includes(i.status)).length;

      setStats({
        totalProjects: projects.length,
        activeProjects: active,
        completedProjects: completed,
        pendingInvoices,
        totalPaid: paymentsData.totalPaid || 0,
      });
      setRecentProjects(projects.slice(0, 5));
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const statCards = [
    { label: "Total Projects", value: stats.totalProjects, icon: FolderKanban, color: "text-blue-600 bg-blue-50" },
    { label: "Active Projects", value: stats.activeProjects, icon: TrendingUp, color: "text-emerald-600 bg-emerald-50" },
    { label: "Completed", value: stats.completedProjects, icon: FolderKanban, color: "text-purple-600 bg-purple-50" },
    { label: "Pending Invoices", value: stats.pendingInvoices, icon: FileText, color: "text-amber-600 bg-amber-50" },
    { label: "Total Paid", value: `$${stats.totalPaid.toLocaleString()}`, icon: CreditCard, color: "text-emerald-600 bg-emerald-50" },
  ];

  const statusColor: Record<string, string> = {
    "new": "bg-gray-100 text-gray-700",
    "planning": "bg-blue-100 text-blue-700",
    "in-progress": "bg-emerald-100 text-emerald-700",
    "review": "bg-amber-100 text-amber-700",
    "testing": "bg-purple-100 text-purple-700",
    "completed": "bg-green-100 text-green-700",
    "on-hold": "bg-orange-100 text-orange-700",
    "cancelled": "bg-red-100 text-red-700",
    "demo": "bg-cyan-100 text-cyan-700",
    "pending-payment": "bg-yellow-100 text-yellow-700",
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" /></div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">My Dashboard</h1>
        <p className="text-muted-foreground">Welcome back! Here&apos;s an overview of your projects and account.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.label} className="bg-white rounded-xl border p-4">
              <div className="flex items-center gap-3 mb-3">
                <div className={`p-2 rounded-lg ${card.color}`}><Icon className="h-4 w-4" /></div>
                <span className="text-sm text-muted-foreground">{card.label}</span>
              </div>
              <p className="text-2xl font-bold">{card.value}</p>
            </div>
          );
        })}
      </div>

      {/* Recent Projects */}
      <div className="bg-white rounded-xl border">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="font-semibold">Recent Projects</h2>
          <Link href="/client/projects" className="text-sm text-primary hover:underline flex items-center gap-1">
            View All <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
        {recentProjects.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            <FolderKanban className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p>No projects yet.</p>
          </div>
        ) : (
          <div className="divide-y">
            {recentProjects.map((project) => (
              <Link key={project._id} href={`/client/projects/${project._id}`}
                className="flex items-center gap-4 p-4 hover:bg-gray-50 transition-colors">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{project.name}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`px-2 py-0.5 text-xs rounded-full ${statusColor[project.status] || "bg-gray-100 text-gray-700"}`}>
                      {project.status.replace("-", " ")}
                    </span>
                    {project.deadline && (
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="h-3 w-3" /> Due {new Date(project.deadline).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="w-20 bg-gray-200 rounded-full h-2">
                    <div className="bg-primary h-2 rounded-full" style={{ width: `${project.progress}%` }} />
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{project.progress}%</p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
