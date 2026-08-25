"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";

interface Stats {
  totalUsers: number;
  totalProducts: number;
  totalPosts: number;
  totalInquiries: number;
  recentInquiries: any[];
  totalProjects: number;
  activeProjects: number;
  completedProjects: number;
  totalClients: number;
  activeClients: number;
  totalLeads: number;
  qualifiedLeads: number;
  totalOrders: number;
  pendingOrders: number;
  totalRevenue: number;
  totalAgents: number;
  activeAgents: number;
  totalAgentConversations: number;
  totalProjectRequests: number;
  pendingProjectRequests: number;
  recentProjects?: any[];
  role?: string;
}

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const [data, setData] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [accessError, setAccessError] = useState<string | null>(null);

  useEffect(() => {
    if (status === "loading") return;
    if (status === "unauthenticated") {
      window.location.href = "/login?callbackUrl=/dashboard";
      return;
    }
    if (status === "authenticated") {
      fetch("/api/dashboard/stats")
        .then(async (response) => {
          const body = await response.json().catch(() => ({}));
          if (response.status === 401) {
            window.location.href = "/login?callbackUrl=/dashboard";
            return;
          }
          if (response.status === 403) {
            setAccessError(body.message || "You do not have permission to view dashboard analytics.");
            return;
          }
          if (!response.ok) {
            setAccessError("Dashboard data is temporarily unavailable. Please try again later.");
            return;
          }
          if (body.success) setData(body.data);
        })
        .catch(() => setAccessError("Dashboard data is temporarily unavailable. Please try again later."))
        .finally(() => setLoading(false));
    }
  }, [status]);

  if (status === "loading") {
    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold">Dashboard Overview</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="rounded-lg border p-6 animate-pulse">
              <div className="h-4 bg-muted rounded w-1/2 mb-2" />
              <div className="h-8 bg-muted rounded w-1/3" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!session) return null;

  if (accessError) {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-6 text-amber-900">
        <h2 className="text-xl font-semibold">Dashboard access is limited</h2>
        <p className="mt-2 text-sm">{accessError}</p>
      </div>
    );
  }

  // Customer view
  if (data?.role === "customer") {
    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold">My Dashboard</h2>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[
            { label: "My Projects", value: data?.totalProjects || 0, icon: "📁", color: "text-blue-500" },
            { label: "Active Projects", value: data?.activeProjects || 0, icon: "🔄", color: "text-green-500" },
            { label: "Completed", value: data?.completedProjects || 0, icon: "✅", color: "text-emerald-500" },
          ].map((stat) => (
            <div key={stat.label} className="rounded-lg border p-6">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">{stat.label}</p>
                <span className={`text-2xl ${stat.color}`}>{stat.icon}</span>
              </div>
              <p className="mt-2 text-3xl font-bold">{stat.value}</p>
            </div>
          ))}
        </div>

        <div className="rounded-lg border p-6">
          <h3 className="text-lg font-semibold mb-4">Recent Projects</h3>
          {data?.recentProjects?.length ? (
            <div className="space-y-3">
              {data.recentProjects.map((project: any) => (
                <Link
                  key={project._id}
                  href={`/dashboard/client-portal?project=${project._id}`}
                  className="flex items-center justify-between border-b pb-3 last:border-0 hover:bg-accent/50 -mx-2 px-2 py-1 rounded transition-colors"
                >
                  <div>
                    <p className="font-medium text-sm">{project.name}</p>
                    <p className="text-xs text-muted-foreground capitalize">{project.projectType?.replace(/-/g, " ")}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full capitalize">{project.status?.replace(/-/g, " ")}</span>
                    {project.budget > 0 && (
                      <p className="text-xs text-muted-foreground mt-1">${project.budget.toLocaleString()}</p>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No projects yet. <Link href="/#contact" className="text-primary underline">Start your first project</Link></p>
          )}
        </div>

        <div className="rounded-lg border p-6">
          <h3 className="text-lg font-semibold mb-4">Quick Actions</h3>
          <div className="space-y-2">
            <Link href="/dashboard/client-portal" className="block rounded-lg border p-3 text-sm hover:bg-accent transition-colors">
              View All My Projects
            </Link>
            <Link href="/#contact" className="block rounded-lg border p-3 text-sm hover:bg-accent transition-colors">
              Start a New Project
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Admin view
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Dashboard Overview</h2>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Total Projects", value: data?.totalProjects || 0, icon: "📁", color: "text-blue-500" },
          { label: "Active Projects", value: data?.activeProjects || 0, icon: "🔄", color: "text-green-500" },
          { label: "Total Clients", value: data?.totalClients || 0, icon: "👤", color: "text-purple-500" },
          { label: "Total Revenue", value: `$${(data?.totalRevenue || 0).toLocaleString()}`, icon: "💰", color: "text-orange-500" },
        ].map((stat) => (
          <div key={stat.label} className="rounded-lg border p-6">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">{stat.label}</p>
              <span className={`text-2xl ${stat.color}`}>{stat.icon}</span>
            </div>
            <p className="mt-2 text-3xl font-bold">{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "AI Agents", value: data?.totalAgents || 0, icon: "🤖", color: "text-violet-500", sub: `${data?.activeAgents || 0} active` },
          { label: "Agent Conversations", value: data?.totalAgentConversations || 0, icon: "💬", color: "text-blue-500" },
          { label: "Project Requests", value: data?.totalProjectRequests || 0, icon: "📋", color: "text-amber-500", sub: `${data?.pendingProjectRequests || 0} pending` },
          { label: "Qualified Leads", value: data?.qualifiedLeads || 0, icon: "🎯", color: "text-emerald-500" },
        ].map((stat) => (
          <div key={stat.label} className="rounded-lg border p-6">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">{stat.label}</p>
              <span className={`text-2xl ${stat.color}`}>{stat.icon}</span>
            </div>
            <p className="mt-2 text-3xl font-bold">{stat.value}</p>
            {stat.sub && <p className="text-xs text-muted-foreground mt-1">{stat.sub}</p>}
          </div>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Total Users", value: data?.totalUsers || 0, icon: "👥", color: "text-blue-500" },
          { label: "Total Products", value: data?.totalProducts || 0, icon: "📦", color: "text-green-500" },
          { label: "Blog Posts", value: data?.totalPosts || 0, icon: "✍️", color: "text-purple-500" },
          { label: "Inquiries", value: data?.totalInquiries || 0, icon: "📩", color: "text-orange-500" },
        ].map((stat) => (
          <div key={stat.label} className="rounded-lg border p-6">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">{stat.label}</p>
              <span className={`text-2xl ${stat.color}`}>{stat.icon}</span>
            </div>
            <p className="mt-2 text-3xl font-bold">{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="rounded-lg border p-6">
          <h3 className="text-lg font-semibold mb-4">Recent Inquiries</h3>
          {data?.recentInquiries?.length ? (
            <div className="space-y-3">
              {data.recentInquiries.map((inquiry: any) => (
                <div key={inquiry._id} className="flex items-center justify-between border-b pb-2 last:border-0">
                  <div>
                    <p className="font-medium text-sm">{inquiry.name}</p>
                    <p className="text-xs text-muted-foreground">{inquiry.subject}</p>
                  </div>
                  <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full">{inquiry.status}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No recent inquiries.</p>
          )}
        </div>

        <div className="rounded-lg border p-6">
          <h3 className="text-lg font-semibold mb-4">Quick Actions</h3>
          <div className="space-y-2">
            <Link href="/dashboard/agents/new" className="block rounded-lg border p-3 text-sm hover:bg-accent transition-colors">
              + Create New AI Agent
            </Link>
            <Link href="/dashboard/agents/project-requests" className="block rounded-lg border p-3 text-sm hover:bg-accent transition-colors">
              View Project Requests {data?.pendingProjectRequests ? `(${data.pendingProjectRequests} pending)` : ""}
            </Link>
            <Link href="/dashboard/projects/new" className="block rounded-lg border p-3 text-sm hover:bg-accent transition-colors">
              + Start New Project
            </Link>
            <Link href="/dashboard/crm/leads" className="block rounded-lg border p-3 text-sm hover:bg-accent transition-colors">
              View CRM Leads
            </Link>
            <Link href="/dashboard/ecommerce/products/new" className="block rounded-lg border p-3 text-sm hover:bg-accent transition-colors">
              + Add New Product
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
