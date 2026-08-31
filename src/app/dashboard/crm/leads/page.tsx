"use client";

import { useState, useEffect } from "react";

interface Lead {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  company?: string;
  source: string;
  status: string;
  score: number;
  requirements?: string;
  serviceInterest?: string[];
  createdAt: string;
}

const STATUS_COLORS: Record<string, string> = {
  new: "bg-blue-100 text-blue-800",
  contacted: "bg-yellow-100 text-yellow-800",
  qualified: "bg-purple-100 text-purple-800",
  proposal: "bg-indigo-100 text-indigo-800",
  negotiation: "bg-orange-100 text-orange-800",
  won: "bg-green-100 text-green-800",
  lost: "bg-red-100 text-red-800",
};

const STATUS_OPTIONS = ["new", "contacted", "qualified", "proposal", "negotiation", "won", "lost"];

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const [editForm, setEditForm] = useState({ name: "", email: "", phone: "", company: "", status: "new", score: 0, notes: "" });
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams();
    if (statusFilter) params.set("status", statusFilter);
    fetch(`/api/crm/leads?${params}`)
      .then((r) => r.json())
      .then((d) => { if (d.success) setLeads(d.data); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [statusFilter]);

  const filtered = leads.filter((l) => l.name.toLowerCase().includes(search.toLowerCase()) || l.email.toLowerCase().includes(search.toLowerCase()));

  const openEdit = (lead: Lead) => {
    setEditingLead(lead);
    setEditForm({ name: lead.name, email: lead.email, phone: lead.phone || "", company: lead.company || "", status: lead.status, score: lead.score, notes: "" });
  };

  const saveEdit = async () => {
    if (!editingLead) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/crm/leads/${editingLead._id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(editForm) });
      if (res.ok) { setEditingLead(null); window.location.reload(); }
    } finally { setSaving(false); }
  };

  const deleteLead = async (id: string) => {
    if (!confirm("Delete this lead? This cannot be undone.")) return;
    setDeleting(id);
    try {
      const res = await fetch(`/api/crm/leads/${id}`, { method: "DELETE" });
      if (res.ok) setLeads((prev) => prev.filter((l) => l._id !== id));
    } finally { setDeleting(null); }
  };

  const updateStatus = async (id: string, status: string) => {
    const res = await fetch(`/api/crm/leads/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) });
    if (res.ok) {
      setLeads((prev) => prev.map((l) => l._id === id ? { ...l, status } : l));
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">CRM Leads</h2>
      </div>

      <div className="flex items-center gap-4">
        <input type="text" placeholder="Search leads..." value={search} onChange={(e) => setSearch(e.target.value)} className="rounded-lg border px-3 py-2 text-sm w-full max-w-sm" />
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="rounded-lg border px-3 py-2 text-sm">
          <option value="">All Status</option>
          {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
        </select>
      </div>

      <div className="rounded-lg border">
        <table className="w-full">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="p-3 text-left text-sm font-medium">Lead</th>
              <th className="p-3 text-left text-sm font-medium">Company</th>
              <th className="p-3 text-left text-sm font-medium">Source</th>
              <th className="p-3 text-left text-sm font-medium">Status</th>
              <th className="p-3 text-left text-sm font-medium">Score</th>
              <th className="p-3 text-right text-sm font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className="p-8 text-center text-sm text-muted-foreground">Loading...</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={6} className="p-8 text-center text-sm text-muted-foreground">No leads found.</td></tr>
            ) : (
              filtered.map((lead) => (
                <tr key={lead._id} className="border-b last:border-0 hover:bg-muted/30">
                  <td className="p-3">
                    <p className="font-medium text-sm">{lead.name}</p>
                    <p className="text-xs text-muted-foreground">{lead.email}</p>
                  </td>
                  <td className="p-3 text-sm">{lead.company || "-"}</td>
                  <td className="p-3 text-sm capitalize">{lead.source}</td>
                  <td className="p-3">
                    <span className={`text-xs px-2 py-1 rounded-full ${STATUS_COLORS[lead.status] || ""}`}>{lead.status}</span>
                  </td>
                  <td className="p-3 text-sm">{lead.score}</td>
                  <td className="p-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      {lead.status === "new" && (
                        <button onClick={() => updateStatus(lead._id, "contacted")} className="rounded p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground text-xs" title="Mark Contacted">Contacted</button>
                      )}
                      {lead.status === "contacted" && (
                        <button onClick={() => updateStatus(lead._id, "qualified")} className="rounded p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground text-xs" title="Qualify">Qualify</button>
                      )}
                      <button onClick={() => openEdit(lead)} className="rounded p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground text-xs" title="Edit">Edit</button>
                      <button onClick={() => deleteLead(lead._id)} disabled={deleting === lead._id} className="rounded p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive text-xs" title="Delete">
                        {deleting === lead._id ? "..." : "Delete"}
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {editingLead && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="rounded-lg bg-background p-6 shadow-lg w-full max-w-md space-y-4">
            <h3 className="text-lg font-semibold">Edit Lead</h3>
            <input type="text" placeholder="Name" value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} className="w-full rounded-lg border px-3 py-2 text-sm" />
            <input type="email" placeholder="Email" value={editForm.email} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} className="w-full rounded-lg border px-3 py-2 text-sm" />
            <input type="text" placeholder="Phone" value={editForm.phone} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} className="w-full rounded-lg border px-3 py-2 text-sm" />
            <input type="text" placeholder="Company" value={editForm.company} onChange={(e) => setEditForm({ ...editForm, company: e.target.value })} className="w-full rounded-lg border px-3 py-2 text-sm" />
            <select value={editForm.status} onChange={(e) => setEditForm({ ...editForm, status: e.target.value })} className="w-full rounded-lg border px-3 py-2 text-sm">
              {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
            </select>
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">Score (0-100)</label>
              <input type="number" min={0} max={100} value={editForm.score} onChange={(e) => setEditForm({ ...editForm, score: parseInt(e.target.value) || 0 })} className="w-full rounded-lg border px-3 py-2 text-sm" />
            </div>
            <textarea placeholder="Notes (internal)" value={editForm.notes} onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })} className="w-full rounded-lg border px-3 py-2 text-sm" rows={3} />
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setEditingLead(null)} className="rounded-lg border px-4 py-2 text-sm hover:bg-muted">Cancel</button>
              <button onClick={saveEdit} disabled={saving} className="rounded-lg bg-primary px-4 py-2 text-sm text-primary-foreground hover:bg-primary/90 disabled:opacity-50">{saving ? "Saving..." : "Save"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
