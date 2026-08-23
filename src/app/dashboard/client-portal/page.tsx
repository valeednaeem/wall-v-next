"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  FolderKanban, Clock, CheckCircle2, AlertCircle, DollarSign,
  FileText, Layers, Target, MessageSquare, ChevronRight, Loader2,
} from "lucide-react";

interface ClientProject {
  _id: string;
  name: string;
  description: string;
  projectType: string;
  status: string;
  lifecycleStatus: string;
  progress: number;
  deadline?: string;
  stages: { name: string; status: string; order: number }[];
  currentStage?: { name: string };
  financial: {
    quotedAmount: number;
    paidAmount: number;
    outstandingAmount: number;
    currency: string;
  };
  requirements: { title: string; status: string; scope: string }[];
  changeRequests: { title: string; status: string; createdAt: string }[];
  createdAt: string;
}

const STATUS_COLORS: Record<string, string> = {
  new: "bg-gray-100 text-gray-600",
  planning: "bg-blue-100 text-blue-700",
  "in-progress": "bg-amber-100 text-amber-700",
  review: "bg-purple-100 text-purple-700",
  testing: "bg-orange-100 text-orange-700",
  completed: "bg-emerald-100 text-emerald-700",
  "on-hold": "bg-gray-100 text-gray-600",
};

export default function ClientPortalPage() {
  const [projects, setProjects] = useState<ClientProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProject, setSelectedProject] = useState<ClientProject | null>(null);

  const fetchProjects = useCallback(async () => {
    try {
      const res = await fetch("/api/projects?clientPortal=true");
      if (res.ok) {
        const data = await res.json();
        setProjects(data.projects || []);
      }
    } catch { /* */ }
    setLoading(false);
  }, []);

  useEffect(() => { fetchProjects(); }, [fetchProjects]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-violet-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">My Projects</h1>
        <p className="text-sm text-gray-500">Track your project progress and deliverables</p>
      </div>

      {projects.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
          <FolderKanban className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">No projects found</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Project List */}
          <div className="space-y-3">
            {projects.map((p) => (
              <button
                key={p._id}
                onClick={() => setSelectedProject(p)}
                className={`w-full text-left bg-white rounded-lg border p-4 hover:shadow-md transition-shadow ${
                  selectedProject?._id === p._id ? "border-violet-300 ring-2 ring-violet-100" : "border-gray-200"
                }`}
              >
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-semibold text-sm text-gray-900">{p.name}</h3>
                  <span className={`px-2 py-0.5 text-[10px] font-medium rounded-full ${STATUS_COLORS[p.status] || ""}`}>
                    {p.status}
                  </span>
                </div>
                <p className="text-xs text-gray-500 capitalize mb-2">{p.projectType}</p>
                <div className="w-full h-1.5 bg-gray-100 rounded-full">
                  <div className="h-full bg-violet-500 rounded-full" style={{ width: `${p.progress || 0}%` }} />
                </div>
                <p className="text-[10px] text-gray-400 mt-1">{p.progress || 0}% complete</p>
              </button>
            ))}
          </div>

          {/* Project Detail */}
          <div className="lg:col-span-2">
            {selectedProject ? (
              <div className="space-y-4">
                <div className="bg-white rounded-lg border border-gray-200 p-6">
                  <h2 className="text-xl font-bold text-gray-900 mb-2">{selectedProject.name}</h2>
                  <p className="text-sm text-gray-500 mb-4">{selectedProject.description}</p>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                    <div>
                      <p className="text-xs text-gray-500">Status</p>
                      <p className="text-sm font-medium capitalize">{selectedProject.status.replace(/-/g, " ")}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Current Stage</p>
                      <p className="text-sm font-medium">{selectedProject.currentStage?.name || "N/A"}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Progress</p>
                      <p className="text-sm font-medium">{selectedProject.progress || 0}%</p>
                    </div>
                    {selectedProject.deadline && (
                      <div>
                        <p className="text-xs text-gray-500">Deadline</p>
                        <p className="text-sm font-medium">{new Date(selectedProject.deadline).toLocaleDateString()}</p>
                      </div>
                    )}
                  </div>

                  {/* Financial Summary */}
                  <div className="grid grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg">
                    <div>
                      <p className="text-xs text-gray-500">Quoted</p>
                      <p className="text-sm font-bold">{selectedProject.financial.currency} {selectedProject.financial.quotedAmount.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Paid</p>
                      <p className="text-sm font-bold text-emerald-600">{selectedProject.financial.currency} {selectedProject.financial.paidAmount.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Outstanding</p>
                      <p className="text-sm font-bold text-amber-600">{selectedProject.financial.currency} {selectedProject.financial.outstandingAmount.toLocaleString()}</p>
                    </div>
                  </div>
                </div>

                {/* Stages */}
                {selectedProject.stages?.length > 0 && (
                  <div className="bg-white rounded-lg border border-gray-200 p-6">
                    <h3 className="font-semibold text-gray-900 mb-3">Project Stages</h3>
                    <div className="space-y-2">
                      {selectedProject.stages.map((stage) => (
                        <div key={stage.name} className="flex items-center gap-3 p-2 rounded-lg">
                          <span className="text-xs text-gray-400 w-6">{stage.order}</span>
                          <span className="flex-1 text-sm">{stage.name}</span>
                          <span className={`px-2 py-0.5 text-[10px] rounded-full ${
                            stage.status === "completed" ? "bg-emerald-100 text-emerald-700" :
                            stage.status === "active" ? "bg-blue-100 text-blue-700" :
                            "bg-gray-100 text-gray-500"
                          }`}>{stage.status}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Requirements */}
                {selectedProject.requirements?.length > 0 && (
                  <div className="bg-white rounded-lg border border-gray-200 p-6">
                    <h3 className="font-semibold text-gray-900 mb-3">Requirements ({selectedProject.requirements.length})</h3>
                    <div className="space-y-1">
                      {selectedProject.requirements.map((req, i) => (
                        <div key={i} className="flex items-center gap-2 text-sm p-1">
                          <span className={`w-2 h-2 rounded-full ${req.scope === "in-scope" ? "bg-emerald-400" : "bg-red-400"}`} />
                          <span className="flex-1">{req.title}</span>
                          <span className="text-xs text-gray-400 capitalize">{req.status}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Change Requests */}
                {selectedProject.changeRequests?.length > 0 && (
                  <div className="bg-white rounded-lg border border-gray-200 p-6">
                    <h3 className="font-semibold text-gray-900 mb-3">Change Requests ({selectedProject.changeRequests.length})</h3>
                    <div className="space-y-2">
                      {selectedProject.changeRequests.map((cr, i) => (
                        <div key={i} className="flex items-center justify-between p-2 rounded-lg border border-gray-100">
                          <span className="text-sm">{cr.title}</span>
                          <span className={`px-2 py-0.5 text-[10px] rounded-full ${
                            cr.status === "approved" ? "bg-emerald-100 text-emerald-700" :
                            cr.status === "rejected" ? "bg-red-100 text-red-700" :
                            "bg-amber-100 text-amber-700"
                          }`}>{cr.status}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
                <p className="text-gray-400">Select a project to view details</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
