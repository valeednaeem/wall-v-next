"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  FolderKanban, Clock, CheckCircle2, AlertCircle, DollarSign,
  FileText, Layers, Target, MessageSquare, ChevronRight, Loader2,
  Globe, Palette, Users, Wrench, Calendar, Building,
} from "lucide-react";

interface ProjectScope {
  description?: string;
  features?: string[];
  exclusions?: string[];
  assumptions?: string[];
  constraints?: string[];
}

interface ProjectFinancial {
  quotedAmount: number;
  paidAmount: number;
  outstandingAmount: number;
  invoicedAmount?: number;
  currency: string;
}

interface ClientProject {
  _id: string;
  name: string;
  description: string;
  projectType: string;
  status: string;
  lifecycleStatus?: string;
  progress: number;
  deadline?: string;
  budget?: number;
  currency?: string;
  stages: any[];
  currentStage?: any;
  financial?: ProjectFinancial;
  requirements: any;
  changeRequests: any[];
  client?: { name: string; email: string; phone?: string; company?: string };
  scope?: ProjectScope;
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
      const res = await fetch("/api/projects");
      if (res.ok) {
        const data = await res.json();
        setProjects(data.projects || []);
      }
    } catch { /* */ }
    setLoading(false);
  }, []);

  useEffect(() => { fetchProjects(); }, [fetchProjects]);

  // Extract extra details from embedded requirements object
  const getExtraDetails = (project: ClientProject) => {
    const reqs = project.requirements;
    if (!reqs || Array.isArray(reqs) || typeof reqs !== "object") return {};
    return {
      industry: reqs.industry,
      targetAudience: reqs.targetAudience,
      integrations: reqs.integrations,
      timeline: reqs.timeline,
      designStyle: reqs.designStyle,
      objective: reqs.objective,
    };
  };

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
        <p className="text-sm text-gray-500">Track your project progress, details, and deliverables</p>
      </div>

      {projects.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
          <FolderKanban className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">No projects found</p>
          <Link href="/#contact" className="mt-3 inline-block text-sm text-violet-600 hover:underline">Start a new project</Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Project List */}
          <div className="space-y-3">
            {projects.map((p) => {
              const extra = getExtraDetails(p);
              return (
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
                  <p className="text-xs text-gray-500 capitalize mb-1">{p.projectType?.replace(/-/g, " ")}</p>
                  {extra.industry && <p className="text-[10px] text-gray-400 mb-1">{extra.industry}</p>}
                  <div className="w-full h-1.5 bg-gray-100 rounded-full mt-2">
                    <div className="h-full bg-violet-500 rounded-full" style={{ width: `${p.progress || 0}%` }} />
                  </div>
                  <div className="flex items-center justify-between mt-1">
                    <p className="text-[10px] text-gray-400">{p.progress || 0}% complete</p>
                    {p.budget ? <p className="text-[10px] text-gray-500 font-medium">${p.budget.toLocaleString()}</p> : null}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Project Detail */}
          <div className="lg:col-span-2">
            {selectedProject ? (
              <div className="space-y-4">
                {/* Main Info */}
                <div className="bg-white rounded-lg border border-gray-200 p-6">
                  <h2 className="text-xl font-bold text-gray-900 mb-1">{selectedProject.name}</h2>
                  <p className="text-sm text-gray-500 mb-4">{selectedProject.description || "No description provided"}</p>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                    <div>
                      <p className="text-xs text-gray-500">Status</p>
                      <p className="text-sm font-medium capitalize">{selectedProject.status?.replace(/-/g, " ")}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Type</p>
                      <p className="text-sm font-medium capitalize">{selectedProject.projectType?.replace(/-/g, " ")}</p>
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

                  {/* Scope / Features */}
                  {selectedProject.scope?.features && selectedProject.scope.features.length > 0 && (
                    <div className="mb-4">
                      <p className="text-xs text-gray-500 mb-1">Features</p>
                      <div className="flex flex-wrap gap-1">
                        {selectedProject.scope.features.map((f, i) => (
                          <span key={i} className="px-2 py-0.5 text-[10px] bg-violet-50 text-violet-700 rounded-full">{f.replace(/-/g, " ")}</span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Financial Summary */}
                  {selectedProject.financial && (
                    <div className="grid grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg">
                      <div>
                        <p className="text-xs text-gray-500">Quoted</p>
                        <p className="text-sm font-bold">{selectedProject.financial.currency} {selectedProject.financial.quotedAmount?.toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Paid</p>
                        <p className="text-sm font-bold text-emerald-600">{selectedProject.financial.currency} {selectedProject.financial.paidAmount?.toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Outstanding</p>
                        <p className="text-sm font-bold text-amber-600">{selectedProject.financial.currency} {selectedProject.financial.outstandingAmount?.toLocaleString()}</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Conversation Details */}
                {(() => {
                  const extra = getExtraDetails(selectedProject);
                  const hasDetails = extra.industry || extra.targetAudience || extra.integrations?.length || extra.timeline || extra.designStyle || extra.objective;
                  if (!hasDetails) return null;
                  return (
                    <div className="bg-white rounded-lg border border-gray-200 p-6">
                      <h3 className="font-semibold text-gray-900 mb-3">Project Details</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {extra.objective && (
                          <div className="md:col-span-2">
                            <p className="text-xs text-gray-500 flex items-center gap-1"><Target className="w-3 h-3" /> Objective</p>
                            <p className="text-sm text-gray-700 mt-1">{extra.objective}</p>
                          </div>
                        )}
                        {extra.industry && (
                          <div>
                            <p className="text-xs text-gray-500 flex items-center gap-1"><Building className="w-3 h-3" /> Industry</p>
                            <p className="text-sm text-gray-700 mt-1">{extra.industry}</p>
                          </div>
                        )}
                        {extra.targetAudience && (
                          <div>
                            <p className="text-xs text-gray-500 flex items-center gap-1"><Users className="w-3 h-3" /> Target Audience</p>
                            <p className="text-sm text-gray-700 mt-1">{extra.targetAudience}</p>
                          </div>
                        )}
                        {extra.timeline && (
                          <div>
                            <p className="text-xs text-gray-500 flex items-center gap-1"><Calendar className="w-3 h-3" /> Timeline</p>
                            <p className="text-sm text-gray-700 mt-1">{extra.timeline}</p>
                          </div>
                        )}
                        {extra.designStyle && (
                          <div>
                            <p className="text-xs text-gray-500 flex items-center gap-1"><Palette className="w-3 h-3" /> Design Style</p>
                            <p className="text-sm text-gray-700 mt-1">{extra.designStyle}</p>
                          </div>
                        )}
                        {extra.integrations && extra.integrations.length > 0 && (
                          <div className="md:col-span-2">
                            <p className="text-xs text-gray-500 flex items-center gap-1"><Wrench className="w-3 h-3" /> Integrations</p>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {extra.integrations.map((int: string, i: number) => (
                                <span key={i} className="px-2 py-0.5 text-[10px] bg-blue-50 text-blue-700 rounded-full">{int.replace(/-/g, " ")}</span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })()}

                {/* Stages */}
                {selectedProject.stages && selectedProject.stages.length > 0 && (
                  <div className="bg-white rounded-lg border border-gray-200 p-6">
                    <h3 className="font-semibold text-gray-900 mb-3">Project Stages</h3>
                    <div className="space-y-2">
                      {selectedProject.stages.map((stage: any, i: number) => {
                        const name = typeof stage === "string" ? stage : stage.name;
                        const stageStatus = typeof stage === "string" ? "pending" : stage.status;
                        return (
                          <div key={i} className="flex items-center gap-3 p-2 rounded-lg">
                            <span className="text-xs text-gray-400 w-6">{i + 1}</span>
                            <span className="flex-1 text-sm">{name}</span>
                            <span className={`px-2 py-0.5 text-[10px] rounded-full ${
                              stageStatus === "completed" ? "bg-emerald-100 text-emerald-700" :
                              stageStatus === "active" ? "bg-blue-100 text-blue-700" :
                              "bg-gray-100 text-gray-500"
                            }`}>{stageStatus}</span>
                          </div>
                        );
                      })}
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
