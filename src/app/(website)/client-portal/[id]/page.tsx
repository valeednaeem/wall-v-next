"use client";

import { useParams } from "next/navigation";
import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Loader2, CheckCircle2, Clock, CreditCard, Eye, ExternalLink,
  DollarSign, Calendar, ArrowRight
} from "lucide-react";

interface Milestone {
  index: number;
  name: string;
  description: string;
  status: "pending" | "in-progress" | "completed";
  amount: number;
  dueDate?: string;
  completedAt?: string;
}

interface Project {
  id: string;
  name: string;
  description: string;
  status: string;
  progress: number;
  budget: number;
  currency: string;
  milestones: Milestone[];
  quote: { min: number; max: number; currency: string };
  requirements: {
    projectType?: string;
    features?: string[];
    timeline?: string;
  };
  client: { name: string; email: string };
  demoId?: string;
  createdAt: string;
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  demo: { label: "Demo Ready", color: "bg-indigo-50 text-indigo-700" },
  planning: { label: "Planning", color: "bg-blue-50 text-blue-700" },
  "in-progress": { label: "In Progress", color: "bg-yellow-50 text-yellow-700" },
  completed: { label: "Completed", color: "bg-green-50 text-green-700" },
  "pending-payment": { label: "Pending Payment", color: "bg-amber-50 text-amber-700" },
};

export default function ClientPortalPage() {
  const params = useParams();
  const projectId = params.id as string;
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchProject = useCallback(async () => {
    try {
      const res = await fetch(`/api/projects/${projectId}`);
      const data = await res.json();
      if (data.project) {
        setProject({
          ...data.project,
          id: data.project._id,
        });
      } else {
        setError("Project not found");
      }
    } catch {
      setError("Failed to load project");
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => { fetchProject(); }, [fetchProject]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <p className="text-lg font-semibold mb-2">Project Not Found</p>
          <p className="text-muted-foreground mb-4">{error}</p>
          <Link href="/" className="text-primary hover:underline">Go back home</Link>
        </div>
      </div>
    );
  }

  const statusCfg = STATUS_LABELS[project.status] || STATUS_LABELS.planning;
  const completedMilestones = project.milestones.filter((m) => m.status === "completed").length;
  const totalMilestoneAmount = project.milestones.reduce((sum, m) => sum + (m.amount || 0), 0);
  const paidAmount = project.milestones
    .filter((m) => m.status === "completed" || m.status === "in-progress")
    .reduce((sum, m) => sum + (m.amount || 0), 0);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">{project.name}</h1>
              <p className="text-sm text-muted-foreground mt-1">Client Portal</p>
            </div>
            <span className={`inline-flex items-center gap-1 rounded-md px-3 py-1 text-sm font-medium ${statusCfg.color}`}>
              {statusCfg.label}
            </span>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        {/* Quick Actions */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {project.demoId && (
            <Link
              href={`/preview/${project.id}`}
              target="_blank"
              className="flex items-center gap-3 bg-white rounded-xl border p-4 hover:shadow-md transition-shadow"
            >
              <Eye className="h-5 w-5 text-primary" />
              <div>
                <p className="font-medium text-sm">View Demo</p>
                <p className="text-xs text-muted-foreground">Preview your project</p>
              </div>
              <ExternalLink className="h-4 w-4 text-muted-foreground ml-auto" />
            </Link>
          )}
          <Link
            href={`/checkout/${project.id}`}
            target="_blank"
            className="flex items-center gap-3 bg-white rounded-xl border p-4 hover:shadow-md transition-shadow"
          >
            <CreditCard className="h-5 w-5 text-green-600" />
            <div>
              <p className="font-medium text-sm">Make Payment</p>
              <p className="text-xs text-muted-foreground">Pay milestone or full project</p>
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground ml-auto" />
          </Link>
          <div className="flex items-center gap-3 bg-white rounded-xl border p-4">
            <DollarSign className="h-5 w-5 text-blue-600" />
            <div>
              <p className="font-medium text-sm">${paidAmount.toLocaleString()} Paid</p>
              <p className="text-xs text-muted-foreground">of ${totalMilestoneAmount.toLocaleString()} total</p>
            </div>
          </div>
        </div>

        {/* Progress */}
        <div className="bg-white rounded-xl border p-6">
          <h2 className="font-semibold mb-4">Project Progress</h2>
          <div className="flex items-center gap-4">
            <div className="flex-1 h-3 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all"
                style={{ width: `${project.progress}%` }}
              />
            </div>
            <span className="text-sm font-medium">{project.progress}%</span>
          </div>
          <div className="grid grid-cols-3 gap-4 mt-4 text-sm">
            <div>
              <p className="text-muted-foreground">Type</p>
              <p className="font-medium capitalize">{project.requirements?.projectType?.replace(/-/g, " ") || "—"}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Features</p>
              <p className="font-medium">{project.requirements?.features?.length || 0} included</p>
            </div>
            <div>
              <p className="text-muted-foreground">Timeline</p>
              <p className="font-medium">{project.requirements?.timeline || "Flexible"}</p>
            </div>
          </div>
        </div>

        {/* Milestones */}
        <div className="bg-white rounded-xl border p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold">Milestones</h2>
            <span className="text-sm text-muted-foreground">{completedMilestones}/{project.milestones.length} completed</span>
          </div>

          {project.milestones.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No milestones defined yet.</p>
          ) : (
            <div className="space-y-3">
              {project.milestones.map((m, i) => (
                <div key={i} className="flex items-start gap-3 p-4 rounded-lg border bg-muted/20">
                  {m.status === "completed" ? (
                    <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5 shrink-0" />
                  ) : m.status === "in-progress" ? (
                    <Clock className="h-5 w-5 text-yellow-600 mt-0.5 shrink-0" />
                  ) : (
                    <div className="h-5 w-5 rounded-full border-2 border-muted-foreground/30 mt-0.5 shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium ${m.status === "completed" ? "line-through text-muted-foreground" : ""}`}>
                      {m.name}
                    </p>
                    {m.description && <p className="text-xs text-muted-foreground mt-0.5">{m.description}</p>}
                    <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                      {m.dueDate && (
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          Due: {new Date(m.dueDate).toLocaleDateString()}
                        </span>
                      )}
                      {m.amount > 0 && (
                        <span className="flex items-center gap-1">
                          <DollarSign className="h-3 w-3" />
                          ${m.amount.toLocaleString()}
                        </span>
                      )}
                      {m.status === "in-progress" && (
                        <Link
                          href={`/checkout/${project.id}?milestone=${m.index}`}
                          className="text-primary hover:underline flex items-center gap-1"
                        >
                          Pay Now <ArrowRight className="h-3 w-3" />
                        </Link>
                      )}
                    </div>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded font-medium ${
                    m.status === "completed" ? "bg-green-50 text-green-700" :
                    m.status === "in-progress" ? "bg-yellow-50 text-yellow-700" :
                    "bg-gray-100 text-gray-600"
                  }`}>
                    {m.status === "completed" ? "Done" : m.status === "in-progress" ? "Active" : "Pending"}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Project Description */}
        <div className="bg-white rounded-xl border p-6">
          <h2 className="font-semibold mb-3">Project Details</h2>
          <p className="text-sm text-muted-foreground whitespace-pre-wrap">{project.description}</p>
          {project.requirements?.features && project.requirements.features.length > 0 && (
            <div className="mt-4">
              <p className="text-xs font-medium text-muted-foreground mb-2">FEATURES</p>
              <div className="flex flex-wrap gap-1">
                {project.requirements.features.map((f, i) => (
                  <span key={i} className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">
                    {f}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
