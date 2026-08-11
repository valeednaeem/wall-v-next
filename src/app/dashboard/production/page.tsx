"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Loader2, Package, DollarSign, Calendar, CheckCircle2, Clock,
  Eye, CreditCard, ArrowRight, TrendingUp, TrendingDown, Minus,
  ChevronDown, ChevronUp, Search, Filter
} from "lucide-react";

interface CostBreakdown {
  development: {
    frontend: number;
    backend: number;
    database: number;
    testing: number;
    design: number;
    total: number;
  };
  thirdParty: {
    hosting: number;
    domain: number;
    apis: number;
    email: number;
    other: number;
    monthlyTotal: number;
    oneTimeTotal: number;
  };
  recurring: { name: string; monthlyCost: number }[];
  oneTime: { name: string; cost: number }[];
}

interface Project {
  _id: string;
  name: string;
  slug: string;
  status: string;
  priority: string;
  progress: number;
  budget: number;
  currency: string;
  description: string;
  client: { name: string; email: string } | string;
  requirements?: {
    projectType?: string;
    features?: string[];
    budget?: string;
    timeline?: string;
    objective?: string;
    industry?: string;
    targetAudience?: string;
  };
  quote?: { min: number; max: number; currency: string };
  milestones: {
    name: string;
    description?: string;
    status: string;
    amount?: number;
    deliverables?: string[];
  }[];
  tags?: string[];
  createdAt: string;
  updatedAt: string;
}

export default function ProductionDashboard() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [expandedProject, setExpandedProject] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const fetchProjects = useCallback(async () => {
    try {
      const res = await fetch("/api/projects?limit=100");
      const data = await res.json();
      setProjects(data.projects || data.data || []);
    } catch {
      setError("Failed to load projects");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchProjects(); }, [fetchProjects]);

  const filteredProjects = projects.filter((p) => {
    const matchesSearch = !searchQuery ||
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (typeof p.client === "object" && p.client.name?.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesStatus = statusFilter === "all" || p.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const stats = {
    total: projects.length,
    demo: projects.filter((p) => p.status === "demo").length,
    inProgress: projects.filter((p) => p.status === "in-progress").length,
    completed: projects.filter((p) => p.status === "completed").length,
    pendingPayment: projects.filter((p) => p.status === "pending-payment").length,
    totalBudget: projects.reduce((sum, p) => sum + (p.budget || 0), 0),
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed": return "bg-green-50 text-green-700 border-green-200";
      case "in-progress": return "bg-blue-50 text-blue-700 border-blue-200";
      case "review": return "bg-yellow-50 text-yellow-700 border-yellow-200";
      case "pending-payment": return "bg-orange-50 text-orange-700 border-orange-200";
      case "demo": return "bg-purple-50 text-purple-700 border-purple-200";
      default: return "bg-gray-50 text-gray-500 border-gray-200";
    }
  };

  const getMilestoneStatusColor = (status: string) => {
    switch (status) {
      case "completed":
      case "approved": return "text-green-600 bg-green-50";
      case "in-progress":
      case "generated": return "text-blue-600 bg-blue-50";
      case "review": return "text-yellow-600 bg-yellow-50";
      default: return "text-gray-500 bg-gray-50";
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <h1 className="text-3xl font-bold">Production Overview</h1>
          <p className="text-muted-foreground mt-1">Monitor project costs, deliverables, and production status</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6">
        {error && (
          <div className="mb-6 p-4 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
            {error}
          </div>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-6">
          <div className="bg-white rounded-xl border p-4">
            <p className="text-xs text-muted-foreground">Total Projects</p>
            <p className="text-2xl font-bold">{stats.total}</p>
          </div>
          <div className="bg-white rounded-xl border p-4">
            <p className="text-xs text-muted-foreground">In Production</p>
            <p className="text-2xl font-bold text-purple-600">{stats.demo}</p>
          </div>
          <div className="bg-white rounded-xl border p-4">
            <p className="text-xs text-muted-foreground">Active</p>
            <p className="text-2xl font-bold text-blue-600">{stats.inProgress}</p>
          </div>
          <div className="bg-white rounded-xl border p-4">
            <p className="text-xs text-muted-foreground">Completed</p>
            <p className="text-2xl font-bold text-green-600">{stats.completed}</p>
          </div>
          <div className="bg-white rounded-xl border p-4">
            <p className="text-xs text-muted-foreground">Pending Payment</p>
            <p className="text-2xl font-bold text-orange-600">{stats.pendingPayment}</p>
          </div>
          <div className="bg-white rounded-xl border p-4">
            <p className="text-xs text-muted-foreground">Total Value</p>
            <p className="text-2xl font-bold">${stats.totalBudget.toLocaleString()}</p>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl border p-4 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search projects..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border rounded-lg text-sm"
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="border rounded-lg px-3 py-2 text-sm"
              >
                <option value="all">All Status</option>
                <option value="demo">Demo</option>
                <option value="in-progress">In Progress</option>
                <option value="completed">Completed</option>
                <option value="pending-payment">Pending Payment</option>
                <option value="review">Review</option>
              </select>
            </div>
          </div>
        </div>

        {/* Projects List */}
        <div className="space-y-4">
          {filteredProjects.map((project) => {
            const isExpanded = expandedProject === project._id;
            const clientName = typeof project.client === "object" ? project.client.name : "Unknown";
            const clientEmail = typeof project.client === "object" ? project.client.email : "";

            return (
              <div key={project._id} className="bg-white rounded-xl border overflow-hidden">
                {/* Project Header */}
                <div
                  className="p-5 cursor-pointer hover:bg-gray-50 transition-colors"
                  onClick={() => setExpandedProject(isExpanded ? null : project._id)}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-lg font-semibold">{project.name}</h3>
                        <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(project.status)}`}>
                          {project.status.replace(/-/g, " ")}
                        </span>
                        {project.requirements?.projectType && (
                          <span className="inline-flex px-2 py-0.5 rounded text-xs bg-gray-100 text-gray-600">
                            {project.requirements.projectType}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                        <span>{clientName}</span>
                        <span>Created {new Date(project.createdAt).toLocaleDateString()}</span>
                        {project.requirements?.budget && (
                          <span>Budget: {project.requirements.budget}</span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-lg font-bold">${project.budget.toLocaleString()}</p>
                        <p className="text-xs text-muted-foreground">{project.currency}</p>
                      </div>
                      {isExpanded ? <ChevronUp className="h-5 w-5 text-muted-foreground" /> : <ChevronDown className="h-5 w-5 text-muted-foreground" />}
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="mt-3">
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-muted-foreground">Progress</span>
                      <span className="font-medium">{project.progress}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-1.5">
                      <div
                        className="bg-primary rounded-full h-1.5 transition-all"
                        style={{ width: `${project.progress}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Expanded Details */}
                {isExpanded && (
                  <div className="border-t p-5 bg-gray-50/50">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Left Column */}
                      <div className="space-y-4">
                        {/* Project Info */}
                        <div>
                          <h4 className="text-sm font-semibold mb-2">Project Details</h4>
                          <div className="text-sm space-y-1">
                            <p><span className="text-muted-foreground">Client:</span> {clientName} ({clientEmail})</p>
                            {project.requirements?.objective && (
                              <p><span className="text-muted-foreground">Objective:</span> {project.requirements.objective}</p>
                            )}
                            {project.requirements?.industry && (
                              <p><span className="text-muted-foreground">Industry:</span> {project.requirements.industry}</p>
                            )}
                            {project.requirements?.targetAudience && (
                              <p><span className="text-muted-foreground">Target:</span> {project.requirements.targetAudience}</p>
                            )}
                            {project.requirements?.timeline && (
                              <p><span className="text-muted-foreground">Timeline:</span> {project.requirements.timeline}</p>
                            )}
                          </div>
                        </div>

                        {/* Cost Estimate */}
                        {project.quote && (
                          <div>
                            <h4 className="text-sm font-semibold mb-2">Cost Estimate</h4>
                            <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3">
                              <div className="flex items-center gap-2">
                                <DollarSign className="h-4 w-4 text-emerald-600" />
                                <span className="text-sm font-medium text-emerald-800">
                                  ${project.quote.min.toLocaleString()} — ${project.quote.max.toLocaleString()} {project.quote.currency}
                                </span>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Features */}
                        {project.requirements?.features && project.requirements.features.length > 0 && (
                          <div>
                            <h4 className="text-sm font-semibold mb-2">Features ({project.requirements.features.length})</h4>
                            <div className="flex flex-wrap gap-1.5">
                              {project.requirements.features.map((f, i) => (
                                <span key={i} className="px-2 py-0.5 rounded text-xs bg-blue-50 text-blue-700 border border-blue-200">
                                  {f}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Right Column */}
                      <div className="space-y-4">
                        {/* Milestones */}
                        <div>
                          <h4 className="text-sm font-semibold mb-2">Milestones ({project.milestones.length})</h4>
                          <div className="space-y-2">
                            {project.milestones.map((m, i) => (
                              <div key={i} className="flex items-start gap-2 p-2 rounded-lg bg-white border">
                                <div className={`mt-0.5 ${getMilestoneStatusColor(m.status)} rounded-full p-1`}>
                                  {(m.status === "completed" || m.status === "approved") ? (
                                    <CheckCircle2 className="h-3 w-3" />
                                  ) : m.status === "in-progress" || m.status === "generated" ? (
                                    <Clock className="h-3 w-3" />
                                  ) : (
                                    <div className="h-3 w-3 rounded-full border border-current" />
                                  )}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center justify-between">
                                    <span className="text-sm font-medium">{m.name}</span>
                                    {m.amount && m.amount > 0 && (
                                      <span className="text-xs font-medium text-muted-foreground">${m.amount.toLocaleString()}</span>
                                    )}
                                  </div>
                                  {m.description && (
                                    <p className="text-xs text-muted-foreground mt-0.5">{m.description}</p>
                                  )}
                                  {m.deliverables && m.deliverables.length > 0 && (
                                    <div className="mt-1 flex flex-wrap gap-1">
                                      {m.deliverables.slice(0, 3).map((d, j) => (
                                        <span key={j} className="text-xs bg-gray-100 px-1.5 py-0.5 rounded">{d}</span>
                                      ))}
                                      {m.deliverables.length > 3 && (
                                        <span className="text-xs text-muted-foreground">+{m.deliverables.length - 3} more</span>
                                      )}
                                    </div>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2 pt-2">
                          <Link
                            href={`/dashboard/projects/${project._id}/edit`}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors"
                          >
                            Edit Project
                          </Link>
                          <Link
                            href={`/preview/${project._id}`}
                            target="_blank"
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium hover:bg-gray-50 transition-colors"
                          >
                            <Eye className="h-3 w-3" />
                            Preview
                          </Link>
                          <Link
                            href={`/checkout/${project._id}`}
                            target="_blank"
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium hover:bg-gray-50 transition-colors"
                          >
                            <CreditCard className="h-3 w-3" />
                            Checkout
                          </Link>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {filteredProjects.length === 0 && (
            <div className="text-center py-12">
              <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No projects found</h3>
              <p className="text-muted-foreground">
                {searchQuery || statusFilter !== "all"
                  ? "Try adjusting your filters"
                  : "Projects will appear here as they are created"}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
