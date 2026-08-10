"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Loader2, FolderOpen, Clock, CheckCircle2, Eye, CreditCard,
  Calendar, MessageSquare
} from "lucide-react";

interface Project {
  _id: string;
  name: string;
  status: string;
  priority: string;
  progress: number;
  budget: number;
  currency: string;
  deadline?: string;
  client: { name: string; email: string };
  milestones: {
    name: string;
    description?: string;
    status: string;
    amount?: number;
    previewUrl?: string;
    deliverables?: string[];
    feedback?: { content: string; submittedAt: Date };
  }[];
  updates?: {
    title: string;
    description: string;
    createdAt: Date;
  }[];
  createdAt: string;
}

export default function MyProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchProjects = useCallback(async () => {
    try {
      const res = await fetch("/api/projects?limit=50");
      const data = await res.json();
      setProjects(data.projects || data.data || []);
    } catch {
      setError("Failed to load projects");
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
      case "changes-requested": return "text-orange-600 bg-orange-50";
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
        <div className="max-w-6xl mx-auto px-6 py-8">
          <h1 className="text-3xl font-bold">My Projects</h1>
          <p className="text-muted-foreground mt-1">Track your projects, milestones, and payments</p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-8">
        {error && (
          <div className="mb-6 p-4 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
            {error}
          </div>
        )}

        {projects.length === 0 ? (
          <div className="text-center py-16">
            <FolderOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">No Projects Yet</h2>
            <p className="text-muted-foreground mb-6">
              Start a conversation with our AI agent to create your first project.
            </p>
            <Link
              href="/hosting-domain"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors"
            >
              Explore Services
            </Link>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white rounded-xl border p-4">
                <p className="text-xs text-muted-foreground">Total Projects</p>
                <p className="text-2xl font-bold">{projects.length}</p>
              </div>
              <div className="bg-white rounded-xl border p-4">
                <p className="text-xs text-muted-foreground">Active</p>
                <p className="text-2xl font-bold text-blue-600">
                  {projects.filter((p) => p.status === "in-progress").length}
                </p>
              </div>
              <div className="bg-white rounded-xl border p-4">
                <p className="text-xs text-muted-foreground">Completed</p>
                <p className="text-2xl font-bold text-green-600">
                  {projects.filter((p) => p.status === "completed").length}
                </p>
              </div>
              <div className="bg-white rounded-xl border p-4">
                <p className="text-xs text-muted-foreground">Pending Payment</p>
                <p className="text-2xl font-bold text-orange-600">
                  {projects.filter((p) => p.status === "pending-payment").length}
                </p>
              </div>
            </div>

            {/* Projects List */}
            <div className="space-y-4">
              {projects.map((project) => {
                const currentMilestone = project.milestones.find(
                  (m) => m.status === "in-progress" || m.status === "generated" || m.status === "review"
                );
                const hasUnpaidMilestones = project.milestones.some(
                  (m) => m.status === "pending" && m.amount && m.amount > 0
                );

                return (
                  <div key={project._id} className="bg-white rounded-xl border overflow-hidden hover:shadow-sm transition-shadow">
                    {/* Project Header */}
                    <div className="p-6">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="text-lg font-semibold">{project.name}</h3>
                            <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(project.status)}`}>
                              {project.status.replace(/-/g, " ")}
                            </span>
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">
                            Created {new Date(project.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="text-lg font-bold">${project.budget.toLocaleString()}</p>
                          <p className="text-xs text-muted-foreground">{project.currency}</p>
                        </div>
                      </div>

                      {/* Progress */}
                      <div className="mt-4">
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-muted-foreground">Progress</span>
                          <span className="font-medium">{project.progress}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-primary rounded-full h-2 transition-all"
                            style={{ width: `${project.progress}%` }}
                          />
                        </div>
                      </div>

                      {/* Current Milestone */}
                      {currentMilestone && (
                        <div className="mt-4 p-3 rounded-lg bg-blue-50 border border-blue-200">
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4 text-blue-600" />
                            <span className="text-sm font-medium text-blue-800">
                              Current: {currentMilestone.name}
                            </span>
                          </div>
                          {currentMilestone.description && (
                            <p className="text-xs text-blue-600 mt-1 ml-6">
                              {currentMilestone.description}
                            </p>
                          )}
                        </div>
                      )}

                      {/* Milestones Timeline */}
                      <div className="mt-4">
                        <p className="text-xs font-medium text-muted-foreground mb-2">Milestones</p>
                        <div className="flex flex-wrap gap-2">
                          {project.milestones.map((m, i) => (
                            <div
                              key={i}
                              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium ${getMilestoneStatusColor(m.status)}`}
                            >
                              {(m.status === "completed" || m.status === "approved") ? (
                                <CheckCircle2 className="h-3 w-3" />
                              ) : m.status === "in-progress" || m.status === "generated" ? (
                                <Clock className="h-3 w-3" />
                              ) : m.status === "changes-requested" ? (
                                <MessageSquare className="h-3 w-3" />
                              ) : (
                                <div className="h-3 w-3 rounded-full border border-current" />
                              )}
                              {m.name}
                              {m.amount ? ` — $${m.amount.toLocaleString()}` : ""}
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-3 mt-4 pt-4 border-t">
                        <Link
                          href={`/projects/${project._id}/milestones`}
                          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
                        >
                          <Eye className="h-4 w-4" />
                          View Milestones
                        </Link>
                        {hasUnpaidMilestones && (
                          <Link
                            href={`/checkout/${project._id}`}
                            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-green-500 text-white text-sm font-medium hover:bg-green-600 transition-colors"
                          >
                            <CreditCard className="h-4 w-4" />
                            Pay
                          </Link>
                        )}
                        {project.deadline && (
                          <span className="text-xs text-muted-foreground flex items-center gap-1 ml-auto">
                            <Calendar className="h-3 w-3" />
                            Due: {new Date(project.deadline).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Recent Updates */}
                    {project.updates && project.updates.length > 0 && (
                      <div className="border-t bg-muted/20 px-6 py-3">
                        <p className="text-xs text-muted-foreground">
                          Latest update: <span className="font-medium">{project.updates[project.updates.length - 1].title}</span>
                          {" — "}
                          {new Date(project.updates[project.updates.length - 1].createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
