"use client";

import { useState, useEffect } from "react";

interface Inquiry {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  company?: string;
  subject: string;
  message?: string;
  status: string;
  type: string;
  priority?: string;
  source?: string;
  createdAt: string;
}

const STATUS_OPTIONS = ["new", "contacted", "in-progress", "resolved", "closed"];
const PRIORITY_OPTIONS = ["low", "medium", "high", "urgent"];

export default function InquiriesPage() {
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [editingInquiry, setEditingInquiry] = useState<Inquiry | null>(null);
  const [editForm, setEditForm] = useState({ name: "", email: "", subject: "", status: "new", priority: "medium", notes: "" });
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  const fetchInquiries = () => {
    fetch("/api/inquiries")
      .then((r) => r.json())
      .then((d) => { if (d.success) setInquiries(d.data); })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchInquiries(); }, []);

  const filtered = inquiries.filter((i) => {
    const matchesSearch = !search || i.name.toLowerCase().includes(search.toLowerCase()) || i.email.toLowerCase().includes(search.toLowerCase()) || i.subject.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = !statusFilter || i.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const openEdit = (inquiry: Inquiry) => {
    setEditingInquiry(inquiry);
    setEditForm({ name: inquiry.name, email: inquiry.email, subject: inquiry.subject, status: inquiry.status, priority: inquiry.priority || "medium", notes: "" });
  };

  const saveEdit = async () => {
    if (!editingInquiry) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/inquiries/${editingInquiry._id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(editForm) });
      if (res.ok) { setEditingInquiry(null); fetchInquiries(); }
    } finally { setSaving(false); }
  };

  const deleteInquiry = async (id: string) => {
    if (!confirm("Delete this inquiry? This cannot be undone.")) return;
    setDeleting(id);
    try {
      const res = await fetch(`/api/inquiries/${id}`, { method: "DELETE" });
      if (res.ok) fetchInquiries();
    } finally { setDeleting(null); }
  };

  const updateStatus = async (id: string, status: string) => {
    const res = await fetch(`/api/inquiries/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) });
    if (res.ok) fetchInquiries();
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Inquiries</h2>

      <div className="flex items-center gap-4">
        <input type="text" placeholder="Search inquiries..." value={search} onChange={(e) => setSearch(e.target.value)} className="rounded-lg border px-3 py-2 text-sm w-full max-w-sm" />
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="rounded-lg border px-3 py-2 text-sm">
          <option value="">All Status</option>
          {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      <div className="rounded-lg border">
        <table className="w-full">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="p-3 text-left text-sm font-medium">Name</th>
              <th className="p-3 text-left text-sm font-medium">Email</th>
              <th className="p-3 text-left text-sm font-medium">Subject</th>
              <th className="p-3 text-left text-sm font-medium">Type</th>
              <th className="p-3 text-left text-sm font-medium">Status</th>
              <th className="p-3 text-left text-sm font-medium">Date</th>
              <th className="p-3 text-right text-sm font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} className="p-8 text-center text-sm text-muted-foreground">Loading...</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={7} className="p-8 text-center text-sm text-muted-foreground">No inquiries found.</td></tr>
            ) : (
              filtered.map((inquiry) => (
                <tr key={inquiry._id} className="border-b last:border-0 hover:bg-muted/30">
                  <td className="p-3 font-medium text-sm">{inquiry.name}</td>
                  <td className="p-3 text-sm">{inquiry.email}</td>
                  <td className="p-3 text-sm">{inquiry.subject}</td>
                  <td className="p-3 text-sm capitalize">{inquiry.type}</td>
                  <td className="p-3">
                    <span className={`text-xs px-2 py-1 rounded-full ${inquiry.status === "new" ? "bg-blue-100 text-blue-800" : inquiry.status === "resolved" ? "bg-green-100 text-green-800" : inquiry.status === "closed" ? "bg-gray-100 text-gray-800" : "bg-yellow-100 text-yellow-800"}`}>
                      {inquiry.status}
                    </span>
                  </td>
                  <td className="p-3 text-sm text-muted-foreground">{new Date(inquiry.createdAt).toLocaleDateString()}</td>
                  <td className="p-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      {inquiry.status === "new" && (
                        <button onClick={() => updateStatus(inquiry._id, "contacted")} className="rounded p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground text-xs" title="Mark Contacted">Contacted</button>
                      )}
                      <button onClick={() => openEdit(inquiry)} className="rounded p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground text-xs" title="Edit">Edit</button>
                      <button onClick={() => deleteInquiry(inquiry._id)} disabled={deleting === inquiry._id} className="rounded p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive text-xs" title="Delete">
                        {deleting === inquiry._id ? "..." : "Delete"}
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {editingInquiry && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="rounded-lg bg-background p-6 shadow-lg w-full max-w-md space-y-4">
            <h3 className="text-lg font-semibold">Edit Inquiry</h3>
            <input type="text" placeholder="Name" value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} className="w-full rounded-lg border px-3 py-2 text-sm" />
            <input type="email" placeholder="Email" value={editForm.email} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} className="w-full rounded-lg border px-3 py-2 text-sm" />
            <input type="text" placeholder="Subject" value={editForm.subject} onChange={(e) => setEditForm({ ...editForm, subject: e.target.value })} className="w-full rounded-lg border px-3 py-2 text-sm" />
            <select value={editForm.status} onChange={(e) => setEditForm({ ...editForm, status: e.target.value })} className="w-full rounded-lg border px-3 py-2 text-sm">
              {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
            <select value={editForm.priority} onChange={(e) => setEditForm({ ...editForm, priority: e.target.value })} className="w-full rounded-lg border px-3 py-2 text-sm">
              {PRIORITY_OPTIONS.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
            <textarea placeholder="Notes (internal)" value={editForm.notes} onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })} className="w-full rounded-lg border px-3 py-2 text-sm" rows={3} />
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setEditingInquiry(null)} className="rounded-lg border px-4 py-2 text-sm hover:bg-muted">Cancel</button>
              <button onClick={saveEdit} disabled={saving} className="rounded-lg bg-primary px-4 py-2 text-sm text-primary-foreground hover:bg-primary/90 disabled:opacity-50">{saving ? "Saving..." : "Save"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
