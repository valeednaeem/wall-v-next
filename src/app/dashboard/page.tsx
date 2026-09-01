"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  FolderKanban, Users, DollarSign, Bot, MessageSquare, ClipboardList,
  Target, Package, FileText, Mail, ArrowRight, Plus, TrendingUp,
  Clock, CheckCircle2, AlertCircle, Zap
} from "lucide-react";

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
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-4 bg-muted rounded w-1/2 mb-2" />
                <div className="h-8 bg-muted rounded w-1/3" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (!session) return null;

  if (accessError) {
    return (
      <Card className="border-amber-200 bg-amber-50">
        <CardContent className="p-6">
          <div className="flex items-center gap-2 text-amber-800">
            <AlertCircle className="h-5 w-5" />
            <h2 className="text-xl font-semibold">Dashboard access is limited</h2>
          </div>
          <p className="mt-2 text-sm text-amber-700">{accessError}</p>
        </CardContent>
      </Card>
    );
  }

  if (data?.role === "customer") {
    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold">My Dashboard</h2>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[
            { label: "My Projects", value: data?.totalProjects || 0, icon: FolderKanban, color: "text-blue-500" },
            { label: "Active", value: data?.activeProjects || 0, icon: TrendingUp, color: "text-green-500" },
            { label: "Completed", value: data?.completedProjects || 0, icon: CheckCircle2, color: "text-emerald-500" },
            { label: "Inquiries", value: data?.totalInquiries || 0, icon: Mail, color: "text-amber-500" },
          ].map((stat) => (
            <Card key={stat.label}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                  <stat.icon className={`h-5 w-5 ${stat.color}`} />
                </div>
                <p className="mt-2 text-3xl font-bold">{stat.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Recent Projects</span>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/dashboard/projects">
                  View All <ArrowRight className="ml-1 h-4 w-4" />
                </Link>
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data?.recentProjects?.length ? (
              <div className="space-y-3">
                {data.recentProjects.map((project: any) => (
                  <Link
                    key={project._id}
                    href={`/dashboard/projects/${project._id}/edit`}
                    className="flex items-center justify-between border-b pb-3 last:border-0 hover:bg-accent/50 -mx-2 px-2 py-1 rounded transition-colors"
                  >
                    <div>
                      <p className="font-medium text-sm">{project.name}</p>
                      <p className="text-xs text-muted-foreground capitalize">{project.projectType?.replace(/-/g, " ")}</p>
                    </div>
                    <div className="text-right">
                      <Badge variant="outline" className="capitalize">{project.status?.replace(/-/g, " ")}</Badge>
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
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 md:grid-cols-2">
              <Button variant="outline" asChild className="justify-start">
                <Link href="/dashboard/projects">
                  <FolderKanban className="mr-2 h-4 w-4" /> View All My Projects
                </Link>
              </Button>
              <Button variant="outline" asChild className="justify-start">
                <Link href="/#contact">
                  <Plus className="mr-2 h-4 w-4" /> Start a New Project
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        {data?.recentInquiries && data.recentInquiries.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Recent Inquiries</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {data.recentInquiries.map((inquiry: any) => (
                  <div key={inquiry._id} className="flex items-center justify-between border-b pb-3 last:border-0">
                    <div>
                      <p className="font-medium text-sm">{inquiry.subject || inquiry.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {inquiry.source === "chat" ? "Via Chat" : inquiry.source === "voice" ? "Via Voice" : "Via Contact Form"}
                        {" · "}
                        {new Date(inquiry.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <Badge variant={inquiry.status === "new" ? "default" : inquiry.status === "contacted" ? "secondary" : "outline"}>
                      {inquiry.status}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    );
  }

  // Admin view
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Dashboard Overview</h2>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Total Projects", value: data?.totalProjects || 0, icon: FolderKanban, color: "text-blue-500" },
          { label: "Active Projects", value: data?.activeProjects || 0, icon: TrendingUp, color: "text-green-500" },
          { label: "Total Clients", value: data?.totalClients || 0, icon: Users, color: "text-purple-500" },
          { label: "Total Revenue", value: `$${(data?.totalRevenue || 0).toLocaleString()}`, icon: DollarSign, color: "text-orange-500" },
        ].map((stat) => (
          <Card key={stat.label}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">{stat.label}</p>
                <stat.icon className={`h-5 w-5 ${stat.color}`} />
              </div>
              <p className="mt-2 text-3xl font-bold">{stat.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "AI Agents", value: data?.totalAgents || 0, icon: Bot, color: "text-violet-500", sub: `${data?.activeAgents || 0} active` },
          { label: "Conversations", value: data?.totalAgentConversations || 0, icon: MessageSquare, color: "text-blue-500" },
          { label: "Project Requests", value: data?.totalProjectRequests || 0, icon: ClipboardList, color: "text-amber-500", sub: `${data?.pendingProjectRequests || 0} pending` },
          { label: "Qualified Leads", value: data?.qualifiedLeads || 0, icon: Target, color: "text-emerald-500" },
        ].map((stat) => (
          <Card key={stat.label}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">{stat.label}</p>
                <stat.icon className={`h-5 w-5 ${stat.color}`} />
              </div>
              <p className="mt-2 text-3xl font-bold">{stat.value}</p>
              {stat.sub && <p className="text-xs text-muted-foreground mt-1">{stat.sub}</p>}
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Total Users", value: data?.totalUsers || 0, icon: Users, color: "text-blue-500" },
          { label: "Total Products", value: data?.totalProducts || 0, icon: Package, color: "text-green-500" },
          { label: "Blog Posts", value: data?.totalPosts || 0, icon: FileText, color: "text-purple-500" },
          { label: "Inquiries", value: data?.totalInquiries || 0, icon: Mail, color: "text-orange-500" },
        ].map((stat) => (
          <Card key={stat.label}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">{stat.label}</p>
                <stat.icon className={`h-5 w-5 ${stat.color}`} />
              </div>
              <p className="mt-2 text-3xl font-bold">{stat.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Recent Inquiries</span>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/dashboard/crm/inquiries">
                  View All <ArrowRight className="ml-1 h-4 w-4" />
                </Link>
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data?.recentInquiries?.length ? (
              <div className="space-y-3">
                {data.recentInquiries.map((inquiry: any) => (
                  <div key={inquiry._id} className="flex items-center justify-between border-b pb-2 last:border-0">
                    <div>
                      <p className="font-medium text-sm">{inquiry.name}</p>
                      <p className="text-xs text-muted-foreground">{inquiry.subject}</p>
                    </div>
                    <Badge variant="outline">{inquiry.status}</Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No recent inquiries.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Button variant="outline" asChild className="w-full justify-start">
                <Link href="/dashboard/agents/new">
                  <Bot className="mr-2 h-4 w-4" /> Create New AI Agent
                </Link>
              </Button>
              <Button variant="outline" asChild className="w-full justify-start">
                <Link href="/dashboard/agents/project-requests">
                  <ClipboardList className="mr-2 h-4 w-4" />
                  View Project Requests {data?.pendingProjectRequests ? `(${data.pendingProjectRequests} pending)` : ""}
                </Link>
              </Button>
              <Button variant="outline" asChild className="w-full justify-start">
                <Link href="/dashboard/projects/new">
                  <Plus className="mr-2 h-4 w-4" /> Start New Project
                </Link>
              </Button>
              <Button variant="outline" asChild className="w-full justify-start">
                <Link href="/dashboard/crm/leads">
                  <Target className="mr-2 h-4 w-4" /> View CRM Leads
                </Link>
              </Button>
              <Button variant="outline" asChild className="w-full justify-start">
                <Link href="/dashboard/ecommerce/products/new">
                  <Package className="mr-2 h-4 w-4" /> Add New Product
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
