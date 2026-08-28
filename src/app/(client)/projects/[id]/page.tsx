"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft, Clock, CheckCircle2, Circle, AlertCircle, FileText, MessageSquare,
  Download, ChevronDown, ChevronRight, Star, Send
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Milestone {
  name: string;
  description?: string;
  status: string;
  dueDate?: string;
  completedAt?: string;
  deliverables?: { name: string; fileUrl: string; status: string }[];
  feedback?: { content: string; rating: number; submittedAt: string };
  version?: number;
  previewUrl?: string;
}

interface Stage {
  _id: string;
  name: string;
  description?: string;
  status: string;
  order: number;
  estimatedDays?: number;
  actualDays?: number;
  startDate?: string;
  endDate?: string;
  deliverables?: { name: string; description?: string; fileUrl?: string; status: string; feedback?: string }[];
}

interface Requirement {
  _id: string;
  title: string;
  description: string;
  category: string;
  priority: string;
  status: string;
  scope: string;
}

interface FileItem {
  name: string;
  url: string;
  size?: number;
  uploadedAt?: string;
}

interface Update {
  title: string;
  description: string;
  author?: { name?: string };
  createdAt: string;
  files?: { name: string; url: string }[];
}

interface Project {
  _id: string;
  name: string;
  title?: string;
  description: string;
  status: string;
  lifecycleStatus?: string;
  progress: number;
  priority: string;
  projectType?: string;
  budget?: number;
  spent?: number;
  currency?: string;
  startDate?: string;
  endDate?: string;
  deadline?: string;
  paymentStatus?: string;
  financial?: { quotedAmount?: number; paidAmount?: number; outstandingAmount?: number };
  milestones: Milestone[];
  stages: Stage[];
  requirements: Requirement[];
  files: FileItem[];
  updates: Update[];
  scope?: { description?: string; features?: string[] };
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

const statusIcon: Record<string, React.ReactNode> = {
  completed: <CheckCircle2 className="h-4 w-4 text-green-500" />,
  approved: <CheckCircle2 className="h-4 w-4 text-green-500" />,
  "in-progress": <Clock className="h-4 w-4 text-blue-500 animate-pulse" />,
  active: <Clock className="h-4 w-4 text-blue-500 animate-pulse" />,
  pending: <Circle className="h-4 w-4 text-gray-400" />,
  blocked: <AlertCircle className="h-4 w-4 text-red-500" />,
  "under-review": <Star className="h-4 w-4 text-amber-500" />,
};

const statusColor: Record<string, string> = {
  "new": "bg-gray-100 text-gray-700",
  "planning": "bg-blue-100 text-blue-700",
  "in-progress": "bg-emerald-100 text-emerald-700",
  "review": "bg-amber-100 text-amber-700",
  "testing": "bg-purple-100 text-purple-700",
  "completed": "bg-green-100 text-green-700",
  "on-hold": "bg-orange-100 text-orange-700",
};

export default function ClientProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"overview" | "milestones" | "stages" | "requirements" | "updates" | "files">("overview");
  const [expandedMilestones, setExpandedMilestones] = useState<Set<number>>(new Set());
  const [feedbackText, setFeedbackText] = useState<Record<number, string>>({});
  const [submittingFeedback, setSubmittingFeedback] = useState<number | null>(null);

  useEffect(() => {
    fetch(`/api/client/projects/${id}`, { credentials: "include" })
      .then((r) => { if (!r.ok) throw new Error("Not found"); return r.json(); })
      .then((data) => { setProject(data); setLoading(false); })
      .catch(() => router.push("/client/projects"));
  }, [id, router]);

  const toggleMilestone = (index: number) => {
    setExpandedMilestones((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index); else next.add(index);
      return next;
    });
  };

  const submitMilestoneFeedback = async (milestoneIndex: number, action: "approve-milestone" | "reject-milestone") => {
    setSubmittingFeedback(milestoneIndex);
    try {
      const res = await fetch(`/api/client/projects/${id}/milestone-feedback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ action, milestoneIndex, feedback: feedbackText[milestoneIndex] || "" }),
      });
      if (res.ok) {
        const data = await res.json();
        setProject((prev) => {
          if (!prev) return null;
          const milestones = [...prev.milestones];
          milestones[milestoneIndex] = data.milestone;
          return { ...prev, milestones };
        });
        setFeedbackText((prev) => { const n = { ...prev }; delete n[milestoneIndex]; return n; });
      }
    } finally { setSubmittingFeedback(null); }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" /></div>;
  }
  if (!project) return null;

  const tabs = [
    { id: "overview" as const, label: "Overview" },
    { id: "milestones" as const, label: `Milestones (${project.milestones?.length || 0})` },
    { id: "stages" as const, label: `Stages (${project.stages?.length || 0})` },
    { id: "requirements" as const, label: `Requirements (${project.requirements?.length || 0})` },
    { id: "updates" as const, label: `Updates (${project.updates?.length || 0})` },
    { id: "files" as const, label: `Files (${project.files?.length || 0})` },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <button onClick={() => router.push("/client/projects")} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-2">
          <ArrowLeft className="h-4 w-4" /> Back to Projects
        </button>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">{project.name}</h1>
            {project.title && <p className="text-muted-foreground">{project.title}</p>}
          </div>
          <div className="flex items-center gap-2">
            <span className={cn("px-3 py-1 text-sm rounded-full", statusColor[project.status] || "bg-gray-100")}>
              {project.status.replace("-", " ")}
            </span>
          </div>
        </div>
      </div>

      {/* Progress */}
      <div className="bg-white rounded-xl border p-5">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium">Overall Progress</span>
          <span className="text-sm font-bold">{project.progress}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-3">
          <div className="bg-primary h-3 rounded-full transition-all" style={{ width: `${project.progress}%` }} />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4 text-sm">
          {project.deadline && (
            <div><span className="text-muted-foreground">Deadline:</span> <span className="font-medium">{new Date(project.deadline).toLocaleDateString()}</span></div>
          )}
          {project.projectType && (
            <div><span className="text-muted-foreground">Type:</span> <span className="font-medium">{project.projectType}</span></div>
          )}
          {project.budget ? (
            <div><span className="text-muted-foreground">Budget:</span> <span className="font-medium">{project.currency} {project.budget.toLocaleString()}</span></div>
          ) : null}
          {project.paymentStatus && (
            <div><span className="text-muted-foreground">Payment:</span> <span className={cn("font-medium",
              project.paymentStatus === "paid" ? "text-green-600" : project.paymentStatus === "partial" ? "text-yellow-600" : "text-red-600"
            )}>{project.paymentStatus}</span></div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b">
        <div className="flex gap-0 overflow-x-auto">
          {tabs.map((tab) => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={cn("px-4 py-3 text-sm font-medium border-b-2 whitespace-nowrap transition-colors",
                activeTab === tab.id ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground")}>
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div className="bg-white rounded-xl border p-5">
        {activeTab === "overview" && (
          <div className="space-y-6">
            <div>
              <h3 className="font-semibold mb-2">Description</h3>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">{project.description}</p>
            </div>
            {project.scope?.features && project.scope.features.length > 0 && (
              <div>
                <h3 className="font-semibold mb-2">Features</h3>
                <ul className="space-y-1">
                  {project.scope.features.map((f, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {project.notes && (
              <div>
                <h3 className="font-semibold mb-2">Notes</h3>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{project.notes}</p>
              </div>
            )}
          </div>
        )}

        {activeTab === "milestones" && (
          <div className="space-y-3">
            {project.milestones?.length === 0 ? (
              <p className="text-muted-foreground text-sm text-center py-8">No milestones yet.</p>
            ) : project.milestones?.map((m, i) => (
              <div key={i} className="border rounded-lg overflow-hidden">
                <button onClick={() => toggleMilestone(i)}
                  className="w-full flex items-center gap-3 p-4 hover:bg-gray-50 text-left">
                  {statusIcon[m.status] || <Circle className="h-4 w-4 text-gray-400" />}
                  <div className="flex-1">
                    <p className="font-medium text-sm">{m.name}</p>
                    {m.dueDate && <p className="text-xs text-muted-foreground">Due: {new Date(m.dueDate).toLocaleDateString()}</p>}
                  </div>
                  <span className={cn("px-2 py-0.5 text-xs rounded-full",
                    m.status === "completed" || m.status === "approved" ? "bg-green-100 text-green-700" :
                    m.status === "in-progress" ? "bg-blue-100 text-blue-700" :
                    "bg-gray-100 text-gray-600"
                  )}>{m.status}</span>
                  {expandedMilestones.has(i) ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                </button>
                {expandedMilestones.has(i) && (
                  <div className="border-t p-4 space-y-3 bg-gray-50">
                    {m.description && <p className="text-sm text-muted-foreground">{m.description}</p>}
                    {m.deliverables && m.deliverables.length > 0 && (
                      <div>
                        <p className="text-xs font-medium mb-1">Deliverables:</p>
                        {m.deliverables.map((d, di) => (
                          <div key={di} className="flex items-center gap-2 text-sm py-1">
                            <FileText className="h-3 w-3 text-muted-foreground" />
                            <span>{d.name}</span>
                            {d.fileUrl && <a href={d.fileUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline"><Download className="h-3 w-3" /></a>}
                          </div>
                        ))}
                      </div>
                    )}
                    {m.feedback && (
                      <div className="p-2 bg-blue-50 rounded text-xs">
                        <p className="font-medium">Your feedback:</p>
                        <p className="text-muted-foreground">{m.feedback.content}</p>
                        {m.feedback.rating && (
                          <div className="flex gap-0.5 mt-1">
                            {Array.from({ length: 5 }).map((_, si) => (
                              <Star key={si} className={cn("h-3 w-3", si < m.feedback!.rating ? "text-amber-400 fill-amber-400" : "text-gray-300")} />
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                    {(m.status === "completed" || m.status === "approved") && !m.feedback && (
                      <div className="flex gap-2">
                        <input value={feedbackText[i] || ""} onChange={(e) => setFeedbackText((prev) => ({ ...prev, [i]: e.target.value }))}
                          placeholder="Leave feedback (optional)..." className="flex-1 rounded-lg border px-3 py-1.5 text-sm" />
                        <button onClick={() => submitMilestoneFeedback(i, "approve-milestone")} disabled={submittingFeedback === i}
                          className="px-3 py-1.5 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 disabled:opacity-50">
                          Approve
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {activeTab === "stages" && (
          <div className="space-y-3">
            {project.stages?.length === 0 ? (
              <p className="text-muted-foreground text-sm text-center py-8">No stages yet.</p>
            ) : project.stages?.sort((a, b) => a.order - b.order).map((stage) => (
              <div key={stage._id} className="border rounded-lg p-4">
                <div className="flex items-center gap-3">
                  {statusIcon[stage.status] || <Circle className="h-4 w-4 text-gray-400" />}
                  <div className="flex-1">
                    <p className="font-medium text-sm">{stage.name}</p>
                    {stage.description && <p className="text-xs text-muted-foreground mt-0.5">{stage.description}</p>}
                  </div>
                  <span className={cn("px-2 py-0.5 text-xs rounded-full",
                    stage.status === "completed" ? "bg-green-100 text-green-700" :
                    stage.status === "active" ? "bg-blue-100 text-blue-700" :
                    "bg-gray-100 text-gray-600"
                  )}>{stage.status}</span>
                </div>
                {stage.deliverables && stage.deliverables.length > 0 && (
                  <div className="mt-3 pl-7 space-y-1">
                    {stage.deliverables.map((d, di) => (
                      <div key={di} className="flex items-center gap-2 text-xs">
                        <FileText className="h-3 w-3 text-muted-foreground" />
                        <span>{d.name}</span>
                        {d.fileUrl && <a href={d.fileUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Download</a>}
                        <span className={cn("px-1.5 py-0.5 rounded",
                          d.status === "approved" ? "bg-green-100 text-green-700" :
                          d.status === "submitted" ? "bg-amber-100 text-amber-700" :
                          "bg-gray-100 text-gray-600"
                        )}>{d.status}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {activeTab === "requirements" && (
          <div className="space-y-3">
            {project.requirements?.length === 0 ? (
              <p className="text-muted-foreground text-sm text-center py-8">No requirements yet.</p>
            ) : project.requirements?.map((req) => (
              <div key={req._id} className="border rounded-lg p-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-medium text-sm">{req.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{req.description}</p>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <span className={cn("px-2 py-0.5 text-xs rounded-full",
                      req.priority === "must-have" ? "bg-red-100 text-red-700" :
                      req.priority === "should-have" ? "bg-amber-100 text-amber-700" :
                      "bg-gray-100 text-gray-600"
                    )}>{req.priority}</span>
                    <span className={cn("px-2 py-0.5 text-xs rounded-full",
                      req.status === "implemented" || req.status === "verified" ? "bg-green-100 text-green-700" :
                      req.status === "in-progress" ? "bg-blue-100 text-blue-700" :
                      "bg-gray-100 text-gray-600"
                    )}>{req.status}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === "updates" && (
          <div className="space-y-3">
            {project.updates?.length === 0 ? (
              <p className="text-muted-foreground text-sm text-center py-8">No updates yet.</p>
            ) : project.updates?.slice().reverse().map((update, i) => (
              <div key={i} className="border rounded-lg p-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-medium text-sm">{update.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5 whitespace-pre-wrap">{update.description}</p>
                  </div>
                  <span className="text-xs text-muted-foreground shrink-0">{new Date(update.createdAt).toLocaleDateString()}</span>
                </div>
                {update.files && update.files.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {update.files.map((f, fi) => (
                      <a key={fi} href={f.url} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-1 px-2 py-1 bg-gray-100 rounded text-xs hover:bg-gray-200">
                        <Download className="h-3 w-3" />{f.name}
                      </a>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {activeTab === "files" && (
          <div className="space-y-2">
            {project.files?.length === 0 ? (
              <p className="text-muted-foreground text-sm text-center py-8">No files yet.</p>
            ) : project.files?.map((file, i) => (
              <div key={i} className="flex items-center gap-3 p-3 border rounded-lg hover:bg-gray-50">
                <FileText className="h-5 w-5 text-muted-foreground shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{file.name}</p>
                  {file.size && <p className="text-xs text-muted-foreground">{(file.size / 1024).toFixed(1)} KB</p>}
                </div>
                {file.uploadedAt && <span className="text-xs text-muted-foreground shrink-0">{new Date(file.uploadedAt).toLocaleDateString()}</span>}
                <a href={file.url} target="_blank" rel="noopener noreferrer"
                  className="shrink-0 p-2 hover:bg-gray-100 rounded-lg">
                  <Download className="h-4 w-4 text-primary" />
                </a>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
