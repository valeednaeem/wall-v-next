"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowLeft, Save, Loader2, Plus, X } from "lucide-react";
import Link from "next/link";

export default function NewProjectPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: "",
    title: "",
    description: "",
    clientName: "",
    clientEmail: "",
    status: "planning",
    priority: "medium",
    budget: 0,
    currency: "USD",
    deadline: "",
    tags: [] as string[],
    notes: "",
  });
  const [tagInput, setTagInput] = useState("");

  const handleSave = async () => {
    if (!form.name || !form.description) return;
    setSaving(true);
    try {
      const body: Record<string, unknown> = {
        name: form.name,
        title: form.title,
        description: form.description,
        client: {
          name: form.clientName,
          email: form.clientEmail,
        },
        status: form.status,
        priority: form.priority,
        budget: form.budget,
        currency: form.currency,
        deadline: form.deadline || undefined,
        tags: form.tags,
        notes: form.notes,
        milestones: [],
        progress: 0,
        spent: 0,
      };

      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        const data = await res.json();
        router.push(`/dashboard/projects/${data.project._id}/edit`);
      }
    } finally {
      setSaving(false);
    }
  };

  const addTag = () => {
    if (tagInput.trim() && !form.tags.includes(tagInput.trim())) {
      setForm({ ...form, tags: [...form.tags, tagInput.trim()] });
      setTagInput("");
    }
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center gap-3">
        <Link href="/dashboard/projects" className="p-2 rounded-lg hover:bg-accent">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold">New Project</h1>
          <p className="text-sm text-muted-foreground">Create a new project</p>
        </div>
      </div>

      <div className="space-y-4 rounded-lg border p-6">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium">Project Name *</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="e.g. E-commerce Redesign"
              className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="text-sm font-medium">Title</label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="Short display title"
              className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
            />
          </div>
        </div>

        <div>
          <label className="text-sm font-medium">Description *</label>
          <textarea
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            rows={4}
            placeholder="Project description, goals, requirements..."
            className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium">Client Name</label>
            <input
              type="text"
              value={form.clientName}
              onChange={(e) => setForm({ ...form, clientName: e.target.value })}
              placeholder="Client name"
              className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="text-sm font-medium">Client Email</label>
            <input
              type="email"
              value={form.clientEmail}
              onChange={(e) => setForm({ ...form, clientEmail: e.target.value })}
              placeholder="client@email.com"
              className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
            />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="text-sm font-medium">Status</label>
            <select
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value })}
              className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
            >
              <option value="planning">Planning</option>
              <option value="in-progress">In Progress</option>
              <option value="demo">Demo</option>
              <option value="pending-payment">Pending Payment</option>
              <option value="on-hold">On Hold</option>
            </select>
          </div>
          <div>
            <label className="text-sm font-medium">Priority</label>
            <select
              value={form.priority}
              onChange={(e) => setForm({ ...form, priority: e.target.value })}
              className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>
          </div>
          <div>
            <label className="text-sm font-medium">Deadline</label>
            <input
              type="date"
              value={form.deadline}
              onChange={(e) => setForm({ ...form, deadline: e.target.value })}
              className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium">Budget ($)</label>
            <input
              type="number"
              value={form.budget || ""}
              onChange={(e) => setForm({ ...form, budget: Number(e.target.value) })}
              placeholder="0"
              className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="text-sm font-medium">Currency</label>
            <select
              value={form.currency}
              onChange={(e) => setForm({ ...form, currency: e.target.value })}
              className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
            >
              <option value="USD">USD</option>
              <option value="EUR">EUR</option>
              <option value="GBP">GBP</option>
              <option value="PKR">PKR</option>
            </select>
          </div>
        </div>

        <div>
          <label className="text-sm font-medium">Tags</label>
          <div className="flex gap-2 mt-1">
            <input
              type="text"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addTag())}
              placeholder="Add tag..."
              className="flex-1 rounded-lg border px-3 py-2 text-sm"
            />
            <button onClick={addTag} type="button" className="px-3 py-2 rounded-lg border text-sm hover:bg-accent">
              <Plus className="h-4 w-4" />
            </button>
          </div>
          {form.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {form.tags.map((tag, i) => (
                <span key={i} className="inline-flex items-center gap-1 bg-primary/10 text-primary px-2 py-0.5 rounded text-xs">
                  {tag}
                  <button onClick={() => setForm({ ...form, tags: form.tags.filter((_, idx) => idx !== i) })}>
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        <div>
          <label className="text-sm font-medium">Notes</label>
          <textarea
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            rows={3}
            placeholder="Internal notes..."
            className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
          />
        </div>
      </div>

      <div className="flex justify-end gap-2">
        <Link
          href="/dashboard/projects"
          className="px-4 py-2 rounded-lg border text-sm font-medium hover:bg-accent"
        >
          Cancel
        </Link>
        <button
          onClick={handleSave}
          disabled={saving || !form.name || !form.description}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Create Project
        </button>
      </div>
    </div>
  );
}
