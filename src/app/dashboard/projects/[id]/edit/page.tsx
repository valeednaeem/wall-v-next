"use client";

import { useRouter, useParams } from "next/navigation";
import { useState, useEffect, useCallback } from "react";
import {
  ArrowLeft, Save, Loader2, Plus, X, CheckCircle2, Clock,
  DollarSign, Trash2, GripVertical, Calendar
} from "lucide-react";
import Link from "next/link";

interface Milestone {
  name: string;
  description: string;
  dueDate: string;
  status: "pending" | "in-progress" | "completed";
  completedAt?: string;
  amount?: number;
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
}

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
    milestones[idx] = {
      ...milestones[idx],
      status: current === "completed" ? "pending" : current === "pending" ? "in-progress" : "completed",
      completedAt: current !== "completed" ? new Date().toISOString() : undefined,
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
              <textarea
                value={project.description}
                onChange={(e) => setProject({ ...project, description: e.target.value })}
                rows={4}
                className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
              />
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
                      {m.status === "completed" ? (
                        <CheckCircle2 className="h-5 w-5 text-green-600" />
                      ) : m.status === "in-progress" ? (
                        <Clock className="h-5 w-5 text-yellow-600" />
                      ) : (
                        <div className="h-5 w-5 rounded-full border-2 border-muted-foreground/30" />
                      )}
                    </button>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium ${m.status === "completed" ? "line-through text-muted-foreground" : ""}`}>
                        {m.name}
                      </p>
                      {m.description && <p className="text-xs text-muted-foreground mt-0.5">{m.description}</p>}
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
                            {m.amount}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
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
