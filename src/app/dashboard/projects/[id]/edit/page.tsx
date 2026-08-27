"use client";

import { useRouter, useParams } from "next/navigation";
import { useState, useEffect, useCallback } from "react";
import {
  ArrowLeft, Save, Loader2, Plus, X, CheckCircle2, Clock,
  DollarSign, Trash2, GripVertical, Calendar, Eye, FileText,
  Settings, Layers, Shield, Sparkles, Target, AlertTriangle,
  GitBranch, Search, Edit2, Download, ExternalLink, ChevronDown,
  ChevronUp, AlertCircle, CheckCircle, XCircle, Pause, Trash
} from "lucide-react";
import Link from "next/link";
import HtmlEditor from "@/components/editor/html-editor";

interface Milestone {
  name: string;
  description: string;
  dueDate: string;
  status: "pending" | "in-progress" | "completed" | "generated" | "review" | "approved" | "changes-requested";
  completedAt?: string;
  amount?: number;
  deliverables?: string[];
  generatedAt?: Date;
  approvedAt?: Date;
  previewUrl?: string;
  version?: number;
  feedback?: {
    content: string;
    rating?: number;
    submittedAt: Date;
  };
}

interface Project {
  _id: string;
  name: string;
  title?: string;
  description: string;
  status: string;
  priority: string;
  budget: number;
  spent: number;
  currency: string;
  progress: number;
  deadline?: string;
  milestones: Milestone[];
  client: { name?: string; email?: string } | string;
  tags: string[];
  notes?: string;
  demoId?: string;
  // Additional fields for admin inspection
  requirements?: Record<string, unknown>;
  costAnalysis?: Record<string, unknown>;
  budgetComparison?: Record<string, unknown>;
  firstMilestone?: Record<string, unknown>;
  productionSummary?: Record<string, unknown>;
  workflowStatus?: { stage: string; lastUpdated: string };
  milestoneVersions?: Array<{
    version: number;
    milestoneName: string;
    milestoneIndex: number;
    previewUrl: string;
    demoId: string;
    generatedAt: string;
    requirements?: Record<string, unknown>;
    feedback?: Record<string, unknown>;
    status: string;
    generatedBy: string;
  }>;
  conversationId?: string;
  inquiryId?: string;
  leadId?: string;
  createdAt: string;
  updatedAt: string;
}

type AdminTab = "overview" | "requirements" | "production" | "costs" | "milestones" | "prototypes" | "preview-links" | "checkout" | "errors" | "ai-decisions";

export default function EditProjectPage() {
  const router = useRouter();
  const params = useParams();
  const projectId = params.id as string;
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showMilestoneForm, setShowMilestoneForm] = useState(false);
  const [editingMilestoneIdx, setEditingMilestoneIdx] = useState<number | null>(null);
  const [milestoneForm, setMilestoneForm] = useState<Milestone>({
    name: "",
    description: "",
    dueDate: "",
    status: "pending",
    amount: 0,
  });

  const fetchProject = useCallback(async () => {
    try {
      const res = await fetch(`/api/projects/${projectId}`);
      const data = await res.json();
      setProject(data.project);
    } catch {
      console.error("Failed to load project");
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => { fetchProject(); }, [fetchProject]);

  const handleSave = async () => {
    if (!project) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/projects/${project._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: project.name,
          title: project.title,
          description: project.description,
          status: project.status,
          priority: project.priority,
          budget: project.budget,
          currency: project.currency,
          deadline: project.deadline,
          progress: project.progress,
          milestones: project.milestones,
          tags: project.tags,
          notes: project.notes,
        }),
      });
      if (res.ok) {
        await fetchProject();
      }
    } finally {
      setSaving(false);
    }
  };

  const addMilestone = () => {
    if (!project || !milestoneForm.name) return;
    const milestones = [...project.milestones];
    if (editingMilestoneIdx !== null) {
      milestones[editingMilestoneIdx] = milestoneForm;
    } else {
      milestones.push(milestoneForm);
    }
    setProject({ ...project, milestones });
    setShowMilestoneForm(false);
    setEditingMilestoneIdx(null);
    setMilestoneForm({ name: "", description: "", dueDate: "", status: "pending", amount: 0 });
  };

  const removeMilestone = (idx: number) => {
    if (!project) return;
    setProject({ ...project, milestones: project.milestones.filter((_, i) => i !== idx) });
  };

  const editMilestone = (idx: number) => {
    if (!project) return;
    setMilestoneForm({ ...project.milestones[idx] });
    setEditingMilestoneIdx(idx);
    setShowMilestoneForm(true);
  };

  const toggleMilestoneStatus = (idx: number) => {
    if (!project) return;
    const milestones = [...project.milestones];
    const current = milestones[idx].status;
    const statusCycle: Record<string, string> = {
      "pending": "in-progress",
      "in-progress": "completed",
      "completed": "pending",
      "generated": "review",
      "review": "approved",
      "approved": "completed",
      "changes-requested": "in-progress",
    };
    milestones[idx] = {
      ...milestones[idx],
      status: (statusCycle[current] || "pending") as Milestone["status"],
      completedAt: statusCycle[current] === "completed" ? new Date().toISOString() : undefined,
    };
    setProject({ ...project, milestones });
  };

  const updateProgress = () => {
    if (!project || project.milestones.length === 0) return;
    const completed = project.milestones.filter((m) => m.status === "completed").length;
    const progress = Math.round((completed / project.milestones.length) * 100);
    setProject({ ...project, progress });
  };

  useEffect(() => { updateProgress(); }, [project?.milestones]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Project not found</p>
        <Link href="/dashboard/projects" className="text-primary hover:underline mt-2 inline-block">
          Back to Projects
        </Link>
      </div>
    );
  }

  const totalMilestoneAmount = project.milestones.reduce((sum, m) => sum + (m.amount || 0), 0);
  const completedMilestones = project.milestones.filter((m) => m.status === "completed").length;

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/projects" className="p-2 rounded-lg hover:bg-accent">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold">{project.name}</h1>
            <p className="text-sm text-muted-foreground">Edit project details and milestones</p>
          </div>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Save Changes
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Details */}
        <div className="lg:col-span-2 space-y-4">
          <div className="rounded-lg border p-4 space-y-4">
            <h2 className="font-semibold">Project Details</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Name</label>
                <input
                  type="text"
                  value={project.name}
                  onChange={(e) => setProject({ ...project, name: e.target.value })}
                  className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Title</label>
                <input
                  type="text"
                  value={project.title || ""}
                  onChange={(e) => setProject({ ...project, title: e.target.value })}
                  className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
                />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">Description</label>
              <div className="mt-1">
                <HtmlEditor
                  value={project.description}
                  onChange={(html) => setProject({ ...project, description: html })}
                  placeholder="Project description..."
                  minHeight="150px"
                />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="text-sm font-medium">Status</label>
                <select
                  value={project.status}
                  onChange={(e) => setProject({ ...project, status: e.target.value })}
                  className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
                >
                  <option value="planning">Planning</option>
                  <option value="in-progress">In Progress</option>
                  <option value="review">Review</option>
                  <option value="testing">Testing</option>
                  <option value="completed">Completed</option>
                  <option value="on-hold">On Hold</option>
                  <option value="cancelled">Cancelled</option>
                  <option value="demo">Demo</option>
                  <option value="pending-payment">Pending Payment</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium">Priority</label>
                <select
                  value={project.priority}
                  onChange={(e) => setProject({ ...project, priority: e.target.value })}
                  className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium">Progress (%)</label>
                <input
                  type="number"
                  value={project.progress}
                  onChange={(e) => setProject({ ...project, progress: Math.min(100, Math.max(0, Number(e.target.value))) })}
                  min={0}
                  max={100}
                  className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
                />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="text-sm font-medium">Budget ($)</label>
                <input
                  type="number"
                  value={project.budget || ""}
                  onChange={(e) => setProject({ ...project, budget: Number(e.target.value) })}
                  className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Spent ($)</label>
                <input
                  type="number"
                  value={project.spent || ""}
                  onChange={(e) => setProject({ ...project, spent: Number(e.target.value) })}
                  className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Deadline</label>
                <input
                  type="date"
                  value={project.deadline?.split("T")[0] || ""}
                  onChange={(e) => setProject({ ...project, deadline: e.target.value })}
                  className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
                />
              </div>
            </div>
          </div>

          {/* Milestones */}
          <div className="rounded-lg border p-4 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold">Milestones</h2>
              <button
                onClick={() => { setMilestoneForm({ name: "", description: "", dueDate: "", status: "pending", amount: 0 }); setEditingMilestoneIdx(null); setShowMilestoneForm(true); }}
                className="flex items-center gap-1 text-sm text-primary hover:underline"
              >
                <Plus className="h-4 w-4" /> Add Milestone
              </button>
            </div>

            {project.milestones.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">No milestones yet. Add milestones to track project progress.</p>
            ) : (
              <div className="space-y-2">
                {project.milestones.map((m, idx) => (
                  <div key={idx} className="flex items-start gap-3 p-3 rounded-lg border bg-muted/30">
                    <button onClick={() => toggleMilestoneStatus(idx)} className="mt-0.5">
                      {m.status === "completed" || m.status === "approved" ? (
                        <CheckCircle2 className="h-5 w-5 text-green-600" />
                      ) : m.status === "in-progress" || m.status === "generated" || m.status === "review" ? (
                        <Clock className="h-5 w-5 text-yellow-600" />
                      ) : m.status === "changes-requested" ? (
                        <div className="h-5 w-5 rounded-full border-2 border-orange-400 bg-orange-100" />
                      ) : (
                        <div className="h-5 w-5 rounded-full border-2 border-muted-foreground/30" />
                      )}
                    </button>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium ${m.status === "completed" ? "line-through text-muted-foreground" : ""}`}>
                        {m.name}
                      </p>
                      {m.description && <p className="text-xs text-muted-foreground mt-0.5">{m.description}</p>}
                      {m.deliverables && m.deliverables.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1.5">
                          {m.deliverables.map((d, di) => (
                            <span key={di} className="text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">{d}</span>
                          ))}
                        </div>
                      )}
                      <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                        {m.dueDate && (
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {new Date(m.dueDate).toLocaleDateString()}
                          </span>
                        )}
                        {m.amount != null && m.amount > 0 && (
                          <span className="flex items-center gap-1">
                            <DollarSign className="h-3 w-3" />
                            ${m.amount.toLocaleString()}
                          </span>
                        )}
                        {m.version && m.version > 1 && (
                          <span className="text-xs text-muted-foreground">v{m.version}</span>
                        )}
                      </div>
                      {m.feedback && (
                        <div className="mt-2 p-2 rounded bg-orange-50 border border-orange-200">
                          <p className="text-xs text-orange-700 font-medium">Client Feedback:</p>
                          <p className="text-xs text-orange-800">{m.feedback.content}</p>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      {(m.status === "generated" || m.status === "review") && m.previewUrl && (
                        <a
                          href={m.previewUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-2 py-1 rounded text-xs bg-primary/10 text-primary hover:bg-primary/20"
                        >
                          Preview
                        </a>
                      )}
                      <button onClick={() => editMilestone(idx)} className="p-1 rounded hover:bg-accent text-xs">
                        Edit
                      </button>
                      <button onClick={() => removeMilestone(idx)} className="p-1 rounded hover:bg-destructive/10 text-destructive">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Stats */}
          <div className="rounded-lg border p-4 space-y-3">
            <h3 className="font-semibold text-sm">Project Stats</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Budget</span>
                <span className="font-medium">${project.budget.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Spent</span>
                <span className="font-medium">${project.spent.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Milestones</span>
                <span className="font-medium">{completedMilestones}/{project.milestones.length}</span>
              </div>
              {totalMilestoneAmount > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Milestone Total</span>
                  <span className="font-medium">${totalMilestoneAmount.toLocaleString()}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-muted-foreground">Progress</span>
                <span className="font-medium">{project.progress}%</span>
              </div>
            </div>
            <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
              <div className="h-full bg-primary rounded-full" style={{ width: `${project.progress}%` }} />
            </div>
          </div>

          {/* Quick Actions */}
          <div className="rounded-lg border p-4 space-y-2">
            <h3 className="font-semibold text-sm">Quick Actions</h3>
            {project.demoId && (
              <Link
                href={`/preview/${project._id}`}
                target="_blank"
                className="block w-full text-center rounded-lg border px-3 py-2 text-sm hover:bg-accent"
              >
                View Demo
              </Link>
            )}
            <Link
              href={`/checkout/${project._id}`}
              target="_blank"
              className="block w-full text-center rounded-lg border px-3 py-2 text-sm hover:bg-accent"
            >
              Open Checkout
            </Link>
          </div>

          {/* Admin Inspection Tabs */}
          <div className="rounded-lg border p-4 space-y-4">
            <h3 className="font-semibold text-sm">Admin Inspection</h3>
            <div className="space-y-2">
              <AdminInspectionTabs project={project} />
            </div>
          </div>
        </div>
      </div>

      {/* Milestone Form Modal */}
      {showMilestoneForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">
                {editingMilestoneIdx !== null ? "Edit Milestone" : "Add Milestone"}
              </h3>
              <button onClick={() => { setShowMilestoneForm(false); setEditingMilestoneIdx(null); }} className="p-1 hover:bg-accent rounded-lg">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div>
              <label className="text-sm font-medium">Name *</label>
              <input
                type="text"
                value={milestoneForm.name}
                onChange={(e) => setMilestoneForm({ ...milestoneForm, name: e.target.value })}
                placeholder="e.g. Design Phase"
                className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Description</label>
              <textarea
                value={milestoneForm.description}
                onChange={(e) => setMilestoneForm({ ...milestoneForm, description: e.target.value })}
                rows={2}
                className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Due Date</label>
                <input
                  type="date"
                  value={milestoneForm.dueDate?.split("T")[0] || ""}
                  onChange={(e) => setMilestoneForm({ ...milestoneForm, dueDate: e.target.value })}
                  className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Amount ($)</label>
                <input
                  type="number"
                  value={milestoneForm.amount || ""}
                  onChange={(e) => setMilestoneForm({ ...milestoneForm, amount: Number(e.target.value) })}
                  className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
                />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">Status</label>
              <select
                value={milestoneForm.status}
                onChange={(e) => setMilestoneForm({ ...milestoneForm, status: e.target.value as Milestone["status"] })}
                className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
              >
                <option value="pending">Pending</option>
                <option value="in-progress">In Progress</option>
                <option value="completed">Completed</option>
              </select>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => { setShowMilestoneForm(false); setEditingMilestoneIdx(null); }}
                className="px-4 py-2 rounded-lg border text-sm hover:bg-accent"
              >
                Cancel
              </button>
              <button
                onClick={addMilestone}
                disabled={!milestoneForm.name}
                className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50"
              >
                {editingMilestoneIdx !== null ? "Update" : "Add"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Admin Inspection Tabs Component
function AdminInspectionTabs({ project }: { project: Project }) {
  const [activeTab, setActiveTab] = useState<AdminTab>("overview");

  const tabs: { id: AdminTab; label: string; icon: React.ReactNode; count?: number }[] = [
    { id: "overview", label: "Overview", icon: <FileText className="h-4 w-4" /> },
    { id: "requirements", label: "Requirements", icon: <Settings className="h-4 w-4" /> },
    { id: "production", label: "Production", icon: <Sparkles className="h-4 w-4" /> },
    { id: "costs", label: "Costs", icon: <DollarSign className="h-4 w-4" /> },
    { id: "milestones", label: "Milestones", icon: <Target className="h-4 w-4" /> },
    { id: "prototypes", label: "Prototypes", icon: <Eye className="h-4 w-4" /> },
    { id: "preview-links", label: "Preview Links", icon: <ExternalLink className="h-4 w-4" /> },
    { id: "checkout", label: "Checkout", icon: <CheckCircle className="h-4 w-4" /> },
    { id: "errors", label: "Errors", icon: <AlertCircle className="h-4 w-4" /> },
    { id: "ai-decisions", label: "AI Decisions", icon: <Search className="h-4 w-4" /> },
  ];

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-1 px-3 py-1.5 rounded text-xs transition-colors ${
              activeTab === tab.id
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-accent"
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      <div className="mt-3 p-3 rounded bg-muted/30 max-h-96 overflow-y-auto">
        {activeTab === "overview" && (
          <AdminOverviewTab project={project} />
        )}
        {activeTab === "requirements" && (
          <AdminRequirementsTab project={project} />
        )}
        {activeTab === "production" && (
          <AdminProductionTab project={project} />
        )}
        {activeTab === "costs" && (
          <AdminCostsTab project={project} />
        )}
        {activeTab === "milestones" && (
          <AdminMilestonesTab project={project} />
        )}
        {activeTab === "prototypes" && (
          <AdminPrototypesTab project={project} />
        )}
        {activeTab === "preview-links" && (
          <AdminPreviewLinksTab project={project} />
        )}
        {activeTab === "checkout" && (
          <AdminCheckoutTab project={project} />
        )}
        {activeTab === "errors" && (
          <AdminErrorsTab project={project} />
        )}
        {activeTab === "ai-decisions" && (
          <AdminAIDecisionsTab project={project} />
        )}
      </div>
    </div>
  );
}

// Tab Components
function AdminOverviewTab({ project }: { project: Project }) {
  return (
    <div className="space-y-3 text-sm">
      <div className="grid grid-cols-2 gap-2">
        <div><span className="text-muted-foreground">Project ID:</span> <code className="ml-2">{project._id}</code></div>
        <div><span className="text-muted-foreground">Name:</span> <span className="ml-2 font-medium">{project.name}</span></div>
        <div><span className="text-muted-foreground">Status:</span> <span className="ml-2 capitalize">{project.status}</span></div>
        <div><span className="text-muted-foreground">Priority:</span> <span className="ml-2 capitalize">{project.priority}</span></div>
        <div><span className="text-muted-foreground">Progress:</span> <span className="ml-2">{project.progress}%</span></div>
        <div><span className="text-muted-foreground">Budget:</span> <span className="ml-2">${project.budget.toLocaleString()}</span></div>
        <div><span className="text-muted-foreground">Spent:</span> <span className="ml-2">${project.spent.toLocaleString()}</span></div>
        <div><span className="text-muted-foreground">Client:</span> <span className="ml-2">{typeof project.client === "object" ? project.client?.name : project.client}</span></div>
        <div><span className="text-muted-foreground">Created:</span> <span className="ml-2">{new Date(project.createdAt).toLocaleString()}</span></div>
        <div><span className="text-muted-foreground">Updated:</span> <span className="ml-2">{new Date(project.updatedAt).toLocaleString()}</span></div>
      </div>
    </div>
  );
}

function AdminRequirementsTab({ project }: { project: Project }) {
  if (!project.requirements || Object.keys(project.requirements).length === 0) {
    return <p className="text-sm text-muted-foreground">No structured requirements found.</p>;
  }

  return (
    <div className="space-y-3 text-sm">
      {Object.entries(project.requirements).map(([key, value]) => (
        <div key={key} className="border-b pb-2">
          <p className="font-medium capitalize">{key.replace(/([A-Z])/g, " $1")}</p>
          <pre className="mt-1 text-xs bg-black/5 p-2 rounded overflow-x-auto text-white/90">
            {JSON.stringify(value, null, 2)}
          </pre>
        </div>
      ))}
    </div>
  );
}

function AdminProductionTab({ project }: { project: Project }) {
  if (!project.productionSummary && !project.firstMilestone) {
    return <p className="text-sm text-muted-foreground">No production analysis found.</p>;
  }

  return (
    <div className="space-y-3 text-sm">
      {project.productionSummary && (
        <div className="border-b pb-3">
          <p className="font-medium">Production Summary</p>
          <pre className="mt-1 text-xs bg-black/5 p-2 rounded overflow-x-auto text-white/90">
            {JSON.stringify(project.productionSummary, null, 2)}
          </pre>
        </div>
      )}
      {project.firstMilestone && (
        <div>
          <p className="font-medium">First Milestone</p>
          <pre className="mt-1 text-xs bg-black/5 p-2 rounded overflow-x-auto text-white/90">
            {JSON.stringify(project.firstMilestone, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}

function AdminCostsTab({ project }: { project: Project }) {
  if (!project.costAnalysis) {
    return <p className="text-sm text-muted-foreground">No cost analysis found.</p>;
  }

  return (
    <div className="space-y-3 text-sm">
      {project.costAnalysis && (
        <div>
          <p className="font-medium">Cost Analysis</p>
          <pre className="mt-1 text-xs bg-black/5 p-2 rounded overflow-x-auto text-white/90 max-h-96">
            {JSON.stringify(project.costAnalysis, null, 2)}
          </pre>
        </div>
      )}
      {project.budgetComparison && (
        <div className="border-t pt-3">
          <p className="font-medium">Budget Comparison</p>
          <pre className="mt-1 text-xs bg-black/5 p-2 rounded overflow-x-auto text-white/90">
            {JSON.stringify(project.budgetComparison, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}

function AdminMilestonesTab({ project }: { project: Project }) {
  if (!project.milestones || project.milestones.length === 0) {
    return <p className="text-sm text-muted-foreground">No milestones found.</p>;
  }

  return (
    <div className="space-y-2 text-sm">
      {project.milestones.map((m, idx) => (
        <div key={idx} className="border p-2 rounded bg-white">
          <div className="flex items-center justify-between">
            <p className="font-medium">{m.name}</p>
            <span className={`px-2 py-0.5 rounded text-xs ${
              m.status === "completed" || m.status === "approved" ? "bg-green-50 text-green-700" :
              m.status === "in-progress" || m.status === "generated" || m.status === "review" ? "bg-yellow-50 text-yellow-700" :
              m.status === "changes-requested" ? "bg-orange-50 text-orange-700" :
              "bg-gray-50 text-gray-700"
            }`}>
              {m.status}
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">{m.description}</p>
          {m.amount && <p className="text-xs mt-1">Amount: ${m.amount.toLocaleString()}</p>}
          {m.dueDate && <p className="text-xs mt-1">Due: {new Date(m.dueDate).toLocaleDateString()}</p>}
          {m.generatedAt && <p className="text-xs mt-1">Generated: {new Date(m.generatedAt).toLocaleString()}</p>}
          {m.approvedAt && <p className="text-xs mt-1">Approved: {new Date(m.approvedAt).toLocaleString()}</p>}
          {m.previewUrl && (
            <a href={m.previewUrl} target="_blank" className="text-xs text-primary hover:underline mt-1 inline-block">Preview Link</a>
          )}
        </div>
      ))}
    </div>
  );
}

function AdminPrototypesTab({ project }: { project: Project }) {
  if (!project.milestoneVersions || project.milestoneVersions.length === 0) {
    return <p className="text-sm text-muted-foreground">No prototype versions found.</p>;
  }

  return (
    <div className="space-y-2 text-sm">
      {project.milestoneVersions.map((mv, idx) => (
        <div key={idx} className="border p-2 rounded bg-white">
          <div className="flex items-center justify-between">
            <p className="font-medium">{mv.milestoneName} (v{mv.version})</p>
            <span className={`px-2 py-0.5 rounded text-xs ${
              mv.status === "generated" ? "bg-blue-50 text-blue-700" :
              mv.status === "approved" ? "bg-green-50 text-green-700" :
              "bg-red-50 text-red-700"
            }`}>
              {mv.status}
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">Generated by: {mv.generatedBy}</p>
          <p className="text-xs text-muted-foreground">Generated at: {new Date(mv.generatedAt).toLocaleString()}</p>
          {mv.previewUrl && (
            <a href={mv.previewUrl} target="_blank" className="text-xs text-primary hover:underline mt-1 inline-block">Preview Link</a>
          )}
          {mv.demoId && <p className="text-xs text-muted-foreground">Demo ID: {mv.demoId}</p>}
          {mv.feedback && (
            <div className="mt-2 p-2 bg-orange-50 rounded text-orange-800 text-xs">
              <p className="font-medium">Feedback:</p>
              <pre className="mt-1">{JSON.stringify(mv.feedback, null, 2)}</pre>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function AdminPreviewLinksTab({ project }: { project: Project }) {
  const previewLinks = [
    ...(project.milestoneVersions?.filter(v => v.previewUrl).map(v => ({
      name: `${v.milestoneName} v${v.version}`,
      url: v.previewUrl,
      demoId: v.demoId,
      createdAt: v.generatedAt,
    })) || []),
    ...(project.demoId ? [{ name: "Main Demo", url: `/preview/${project._id}`, demoId: project.demoId, createdAt: project.createdAt }] : []),
  ];

  if (previewLinks.length === 0) {
    return <p className="text-sm text-muted-foreground">No preview links found.</p>;
  }

  return (
    <div className="space-y-2 text-sm">
      {previewLinks.map((link, idx) => (
        <div key={idx} className="border p-2 rounded bg-white flex items-center justify-between">
          <div>
            <p className="font-medium">{link.name}</p>
            <p className="text-xs text-muted-foreground">Demo ID: {link.demoId}</p>
            <p className="text-xs text-muted-foreground">Created: {new Date(link.createdAt).toLocaleString()}</p>
          </div>
          <a href={link.url} target="_blank" className="px-3 py-1 bg-primary text-white text-xs rounded hover:bg-primary/90">Open</a>
        </div>
      ))}
    </div>
  );
}

function AdminCheckoutTab({ project }: { project: Project }) {
  return (
    <div className="space-y-3 text-sm">
      <div className="border p-2 rounded bg-white">
        <p className="font-medium">Checkout URL</p>
        <p className="text-xs text-primary mt-1 truncate">{`/checkout/${project._id}`}</p>
        <a href={`/checkout/${project._id}`} target="_blank" className="px-3 py-1 bg-primary text-white text-xs rounded hover:bg-primary/90 mt-2 inline-block">Open Checkout</a>
      </div>
      {project.milestones && project.milestones.length > 0 && (
        <div className="border p-2 rounded bg-white">
          <p className="font-medium">Milestone Checkout Links</p>
          {project.milestones.map((m, idx) => m.amount && m.amount > 0 && (
            <div key={idx} className="mt-2">
              <p className="text-xs font-medium">{m.name}</p>
              <p className="text-xs text-primary truncate">{`/checkout/${project._id}?milestone=${idx}`}</p>
              <a href={`/checkout/${project._id}?milestone=${idx}`} target="_blank" className="px-2 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700 mt-1 inline-block">Pay Milestone</a>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function AdminErrorsTab({ project }: { project: Project }) {
  const [errors, setErrors] = useState<{ _id: string; timestamp: string; operation: string; api: string; message: string; stack?: string; status: string; retryCount: number }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchErrors();
  }, [project._id]);

  const fetchErrors = async () => {
    try {
      const res = await fetch(`/api/agents/audit-logs?agentId=${project._id}&category=error&limit=20`);
      const data = await res.json();
      setErrors(data.logs || []);
    } catch {
      console.error("Failed to fetch errors");
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="flex items-center justify-center py-4"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" /></div>;

  if (errors.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <p className="text-sm">No errors logged for this project</p>
        <p className="text-xs mt-1">Errors from agent executions and tool calls will appear here</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {errors.map((error) => (
        <div key={error._id} className="border rounded-lg p-3 bg-red-50 border-red-200">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">{new Date(error.timestamp).toLocaleString()}</span>
            <span className={`text-xs px-2 py-0.5 rounded ${error.status === "resolved" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>{error.status}</span>
          </div>
          <p className="text-sm font-medium mt-1">{error.operation}</p>
          <p className="text-xs text-red-600 mt-1">{error.message}</p>
          {error.retryCount > 0 && <p className="text-xs text-muted-foreground mt-1">Retried {error.retryCount} time(s)</p>}
        </div>
      ))}
    </div>
  );
}

function AdminAIDecisionsTab({ project }: { project: Project }) {
  const [decisions, setDecisions] = useState<{ _id: string; type: string; reasoning: string; outcome: string; confidence: number; timestamp: string }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDecisions();
  }, [project._id]);

  const fetchDecisions = async () => {
    try {
      const res = await fetch(`/api/agents/conversations?agentId=${project._id}&limit=10`);
      const data = await res.json();
      const convs = data.conversations || [];
      const extracted = convs.flatMap((c: Record<string, unknown>) => {
        const msgs = (c.messages as { role: string; content: string; timestamp: string }[]) || [];
        return msgs.filter((m) => m.role === "assistant").map((m, i: number) => ({
          _id: `${c._id}-${i}`,
          type: "conversation",
          reasoning: m.content.slice(0, 200),
          outcome: "response-generated",
          confidence: 85,
          timestamp: m.timestamp,
        }));
      });
      setDecisions(extracted.slice(0, 20));
    } catch {
      console.error("Failed to fetch decisions");
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="flex items-center justify-center py-4"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" /></div>;

  return (
    <div className="space-y-4">
      {/* Linked Resources */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {project.conversationId && (
          <div className="border p-3 rounded-lg bg-blue-50 border-blue-200">
            <p className="text-xs font-medium text-blue-700">Conversation</p>
            <p className="text-xs text-blue-600 mt-1 truncate">{project.conversationId}</p>
          </div>
        )}
        {project.inquiryId && (
          <div className="border p-3 rounded-lg bg-purple-50 border-purple-200">
            <p className="text-xs font-medium text-purple-700">Inquiry</p>
            <p className="text-xs text-purple-600 mt-1 truncate">{project.inquiryId}</p>
          </div>
        )}
        {project.leadId && (
          <div className="border p-3 rounded-lg bg-green-50 border-green-200">
            <p className="text-xs font-medium text-green-700">Lead</p>
            <p className="text-xs text-green-600 mt-1 truncate">{project.leadId}</p>
          </div>
        )}
      </div>

      {/* AI Decisions Log */}
      {decisions.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <p className="text-sm">No AI decisions logged yet</p>
          <p className="text-xs mt-1">AI reasoning from conversations will appear here</p>
        </div>
      ) : (
        <div className="space-y-2">
          {decisions.map((d) => (
            <div key={d._id} className="border rounded-lg p-3 bg-white">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium capitalize">{d.type}</span>
                <span className="text-xs text-muted-foreground">{new Date(d.timestamp).toLocaleDateString()}</span>
              </div>
              <p className="text-xs text-muted-foreground mt-2 line-clamp-3">{d.reasoning}</p>
              <div className="flex items-center gap-2 mt-2">
                <span className="text-xs bg-muted px-2 py-0.5 rounded">{d.outcome}</span>
                <span className="text-xs text-muted-foreground">Confidence: {d.confidence}%</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
