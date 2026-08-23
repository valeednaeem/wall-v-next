"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, CheckCircle, XCircle, Clock, FileText, ExternalLink, Loader2 } from "lucide-react";

interface ProjectRequest {
  _id: string;
  agent: { name: string; slug: string };
  client: { name: string; email: string; phone?: string; company?: string };
  requirements: {
    projectType: string;
    objective: string;
    features: string[];
    budget?: { min: number; max: number; currency: string };
    timeline?: string;
    designStyle?: string;
    industry?: string;
    targetAudience?: string;
    integrations?: string[];
  };
  status: string;
  approvalStatus?: string;
  project?: { name: string; slug: string; status: string };
  quote?: { min: number; max: number; currency: string };
  createdAt: string;
}

export default function ProjectRequestsPage() {
  const [requests, setRequests] = useState<ProjectRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState("all");
  const [processing, setProcessing] = useState<string | null>(null);

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    try {
      const res = await fetch("/api/agents/project-requests");
      const data = await res.json();
      setRequests(data.requests || []);
    } catch {
      console.error("Failed to fetch requests");
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (id: string, action: "approve" | "reject") => {
    setProcessing(id);
    try {
      await fetch("/api/agents/project-requests", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, action }),
      });
      fetchRequests();
    } catch {
      console.error("Failed to process request");
    } finally {
      setProcessing(null);
    }
  };

  const createProject = async (id: string) => {
    setProcessing(id);
    try {
      const res = await fetch(`/api/agents/project-requests/${id}/create-project`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      if (res.ok) {
        fetchRequests();
      }
    } catch {
      console.error("Failed to create project");
    } finally {
      setProcessing(null);
    }
  };

  const filtered = filterStatus === "all" ? requests : requests.filter((r) => r.status === filterStatus);

  const statusColors: Record<string, string> = {
    collecting: "bg-blue-100 text-blue-700",
    "requirements-gathered": "bg-amber-100 text-amber-700",
    quoted: "bg-purple-100 text-purple-700",
    approved: "bg-emerald-100 text-emerald-700",
    "project-created": "bg-violet-100 text-violet-700",
    rejected: "bg-red-100 text-red-700",
    expired: "bg-gray-100 text-gray-500",
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Project Requests</h1>
          <p className="text-sm text-gray-500">AI-generated project requirements from client conversations</p>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex gap-2">
          {["all", "collecting", "requirements-gathered", "approved", "project-created", "rejected"].map((s) => (
            <button
              key={s}
              onClick={() => setFilterStatus(s)}
              className={`px-3 py-1.5 text-sm rounded-lg capitalize transition-colors ${
                filterStatus === s ? "bg-violet-100 text-violet-700" : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              {s.replace(/-/g, " ")}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-600" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
          <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">No project requests yet</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((req) => (
            <div key={req._id} className="bg-white rounded-lg border border-gray-200 p-5">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-semibold text-gray-900">
                    {req.requirements.projectType} - {req.client.name}
                  </h3>
                  <p className="text-sm text-gray-500">
                    {req.client.email} {req.client.company && `• ${req.client.company}`}
                  </p>
                </div>
                <span className={`px-2 py-1 text-xs font-medium rounded-full ${statusColors[req.status] || ""}`}>
                  {req.status.replace(/-/g, " ")}
                </span>
              </div>

              <p className="text-sm text-gray-600 mb-3">{req.requirements.objective}</p>

              <div className="flex flex-wrap gap-2 mb-3">
                {req.requirements.features?.map((f) => (
                  <span key={f} className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full">{f}</span>
                ))}
              </div>

              <div className="flex items-center gap-4 text-sm text-gray-500 mb-4">
                {req.requirements.budget && (
                  <span>Budget: ${req.requirements.budget.min.toLocaleString()} - ${req.requirements.budget.max.toLocaleString()}</span>
                )}
                {req.requirements.timeline && <span>Timeline: {req.requirements.timeline}</span>}
                {req.quote && (
                  <span className="font-medium text-violet-600">
                    Quote: ${req.quote.min.toLocaleString()} - ${req.quote.max.toLocaleString()}
                  </span>
                )}
              </div>

              {req.project && (
                <div className="bg-emerald-50 rounded-lg p-3 mb-4 flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-500" />
                  <span className="text-sm text-emerald-700">Project created: </span>
                  <Link href={`/dashboard/projects/${req.project.slug}`} className="text-sm font-medium text-emerald-700 hover:underline">
                    {req.project.name}
                  </Link>
                </div>
              )}

              <div className="flex items-center gap-2">
                {req.status === "requirements-gathered" && (
                  <>
                    <button
                      onClick={() => handleAction(req._id, "approve")}
                      disabled={processing === req._id}
                      className="flex items-center gap-1 px-3 py-1.5 text-sm bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50"
                    >
                      {processing === req._id ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                      Approve
                    </button>
                    <button
                      onClick={() => handleAction(req._id, "reject")}
                      disabled={processing === req._id}
                      className="flex items-center gap-1 px-3 py-1.5 text-sm border border-red-200 text-red-600 rounded-lg hover:bg-red-50 disabled:opacity-50"
                    >
                      <XCircle className="w-4 h-4" />
                      Reject
                    </button>
                  </>
                )}
                {req.status === "approved" && (
                  <button
                    onClick={() => createProject(req._id)}
                    disabled={processing === req._id}
                    className="flex items-center gap-1 px-3 py-1.5 text-sm bg-violet-600 text-white rounded-lg hover:bg-violet-700 disabled:opacity-50"
                  >
                    {processing === req._id ? <Loader2 className="w-4 h-4 animate-spin" /> : <ExternalLink className="w-4 h-4" />}
                    Create Project
                  </button>
                )}
                <span className="text-xs text-gray-400 ml-auto">
                  {new Date(req.createdAt).toLocaleDateString()}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
