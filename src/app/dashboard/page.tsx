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
}

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const [data, setData] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    if (status === "loading") return;
    if (!authChecked) {
      setAuthChecked(true);
    }
  }, [status, authChecked]);

  useEffect(() => {
    if (!authChecked) return;
    if (status === "unauthenticated") {
      window.location.href = "/login";
      return;
    }
    if (status === "authenticated") {
      fetch("/api/dashboard/stats")
        .then((r) => r.json())
        .then((d) => { if (d.success) setData(d.data); })
        .catch(() => {})
        .finally(() => setLoading(false));
    }
  }, [status, authChecked]);

  if (status === "loading" || !authChecked) {
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
            <Link href="/dashboard/ecommerce/products/new" className="block rounded-lg border p-3 text-sm hover:bg-accent transition-colors">
              + Add New Product
            </Link>
            <Link href="/dashboard/blog/new" className="block rounded-lg border p-3 text-sm hover:bg-accent transition-colors">
              + Create Blog Post
            </Link>
            <Link href="/dashboard/projects/new" className="block rounded-lg border p-3 text-sm hover:bg-accent transition-colors">
              + Start New Project
            </Link>
            <Link href="/dashboard/crm/leads" className="block rounded-lg border p-3 text-sm hover:bg-accent transition-colors">
              View CRM Leads
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
