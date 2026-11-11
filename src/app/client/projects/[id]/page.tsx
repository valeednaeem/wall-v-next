"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Clock, CheckCircle, Circle, FileText, Users, Calendar } from "lucide-react";

interface Stage {
  _id: string;
  name: string;
  description?: string;
  status: string;
  order: number;
}

interface Milestone {
  name: string;
  description?: string;
  status: string;
  dueDate?: string;
  amount?: number;
  deliverables?: string[];
}

interface Requirement {
  _id: string;
  title: string;
  description?: string;
  category?: string;
  priority?: string;
  status?: string;
}

interface Project {
  _id: string;
  name: string;
  description?: string;
  status: string;
  progress: number;
  priority: string;
  projectType?: string;
  deadline?: string;
  budget?: number;
  currency?: string;
  stages: Stage[];
  currentStage?: Stage;
  milestones: Milestone[];
  requirements: Requirement[];
  scope?: { description?: string; features?: string[] };
  createdAt: string;
}

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
};

const stageStatusIcon: Record<string, typeof CheckCircle> = {
  completed: CheckCircle,
  "in-progress": Clock,
  pending: Circle,
};

export default function ClientProjectDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`/api/client/projects/${params.id}`, { credentials: "include" })
      .then((r) => {
        if (!r.ok) throw new Error("Project not found");
        return r.json();
      })
      .then((data) => { setProject(data.project); setLoading(false); })
      .catch((e) => { setError(e.message); setLoading(false); });
  }, [params.id]);

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" /></div>;
  }

  if (error || !project) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground mb-4">{error || "Project not found"}</p>
        <Link href="/client/projects" className="text-primary hover:underline">Back to Projects</Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <Link href="/client/projects" className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1 mb-3">
          <ArrowLeft className="h-3 w-3" /> Back to Projects
        </Link>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold">{project.name}</h1>
            {project.projectType && <p className="text-muted-foreground capitalize mt-1">{project.projectType.replace(/-/g, " ")}</p>}
          </div>
          <span className={`px-3 py-1 text-sm rounded-full ${statusColor[project.status] || "bg-gray-100 text-gray-700"}`}>
            {project.status.replace(/-/g, " ")}
          </span>
        </div>
      </div>

      {/* Progress */}
      <div className="bg-white rounded-xl border p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium">Overall Progress</span>
          <span className="text-sm text-muted-foreground">{project.progress}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-3">
          <div className="bg-primary h-3 rounded-full transition-all" style={{ width: `${project.progress}%` }} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Description */}
          {project.description && (
            <div className="bg-white rounded-xl border p-4">
              <h2 className="font-semibold mb-2">Description</h2>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">{project.description}</p>
            </div>
          )}

          {/* Scope / Features */}
          {project.scope?.features && project.scope.features.length > 0 && (
            <div className="bg-white rounded-xl border p-4">
              <h2 className="font-semibold mb-2">Features</h2>
              <ul className="space-y-1">
                {project.scope.features.map((f, i) => (
                  <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Requirements */}
          {project.requirements.length > 0 && (
            <div className="bg-white rounded-xl border p-4">
              <h2 className="font-semibold mb-3">Requirements</h2>
              <div className="space-y-2">
                {project.requirements.map((req) => (
                  <div key={req._id} className="border rounded-lg p-3">
                    <div className="flex items-center justify-between">
                      <p className="font-medium text-sm">{req.title}</p>
                      <div className="flex items-center gap-2">
                        {req.priority && (
                          <span className={`text-xs px-2 py-0.5 rounded-full ${req.priority === "high" ? "bg-red-100 text-red-700" : req.priority === "medium" ? "bg-amber-100 text-amber-700" : "bg-gray-100 text-gray-600"}`}>
                            {req.priority}
                          </span>
                        )}
                        {req.status && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">{req.status}</span>
                        )}
                      </div>
                    </div>
                    {req.description && <p className="text-xs text-muted-foreground mt-1">{req.description}</p>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Stages */}
          {project.stages.length > 0 && (
            <div className="bg-white rounded-xl border p-4">
              <h2 className="font-semibold mb-3">Project Stages</h2>
              <div className="space-y-2">
                {project.stages.sort((a, b) => a.order - b.order).map((stage) => {
                  const Icon = stageStatusIcon[stage.status] || Circle;
                  return (
                    <div key={stage._id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50">
                      <Icon className={`h-5 w-5 shrink-0 ${stage.status === "completed" ? "text-emerald-500" : stage.status === "in-progress" ? "text-blue-500" : "text-gray-300"}`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">{stage.name}</p>
                        {stage.description && <p className="text-xs text-muted-foreground truncate">{stage.description}</p>}
                      </div>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${stage.status === "completed" ? "bg-emerald-100 text-emerald-700" : stage.status === "in-progress" ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-600"}`}>
                        {stage.status}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Details */}
          <div className="bg-white rounded-xl border p-4 space-y-3">
            <h3 className="font-semibold text-sm">Project Details</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Status</span><span className="capitalize">{project.status.replace(/-/g, " ")}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Priority</span><span className="capitalize">{project.priority}</span></div>
              {project.deadline && <div className="flex justify-between"><span className="text-muted-foreground">Deadline</span><span>{new Date(project.deadline).toLocaleDateString()}</span></div>}
              {project.budget && project.budget > 0 && <div className="flex justify-between"><span className="text-muted-foreground">Budget</span><span>{project.currency || "$"}{project.budget.toLocaleString()}</span></div>}
              <div className="flex justify-between"><span className="text-muted-foreground">Created</span><span>{new Date(project.createdAt).toLocaleDateString()}</span></div>
            </div>
          </div>

          {/* Milestones */}
          {project.milestones.length > 0 && (
            <div className="bg-white rounded-xl border p-4">
              <h3 className="font-semibold text-sm mb-3">Milestones</h3>
              <div className="space-y-2">
                {project.milestones.map((ms, i) => (
                  <div key={i} className="border rounded-lg p-2">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium">{ms.name}</p>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${ms.status === "completed" ? "bg-emerald-100 text-emerald-700" : ms.status === "in-progress" ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-600"}`}>
                        {ms.status}
                      </span>
                    </div>
                    {ms.amount && <p className="text-xs text-muted-foreground mt-1">{project.currency || "$"}{ms.amount.toLocaleString()}</p>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Current Stage */}
          {project.currentStage && (
            <div className="bg-blue-50 rounded-xl border border-blue-200 p-4">
              <h3 className="font-semibold text-sm text-blue-900 mb-1">Current Stage</h3>
              <p className="text-sm text-blue-800">{project.currentStage.name}</p>
              {project.currentStage.description && <p className="text-xs text-blue-600 mt-1">{project.currentStage.description}</p>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
