"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface Client {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  company?: string;
  type: string;
  status: string;
  totalProjects: number;
  totalSpent: number;
}

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [editForm, setEditForm] = useState({ name: "", email: "", phone: "", company: "", type: "individual", status: "active" });
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  const fetchClients = () => {
    const params = new URLSearchParams();
    if (statusFilter) params.set("status", statusFilter);
    if (search) params.set("search", search);
    fetch(`/api/clients?${params}`)
      .then((r) => r.json())
      .then((d) => { if (d.success) setClients(d.data); })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchClients(); }, [statusFilter]);

  const filtered = clients.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.email.toLowerCase().includes(search.toLowerCase()) ||
    (c.company && c.company.toLowerCase().includes(search.toLowerCase()))
  );

  const openEdit = (client: Client) => {
    setEditingClient(client);
    setEditForm({ name: client.name, email: client.email, phone: client.phone || "", company: client.company || "", type: client.type, status: client.status });
  };

  const saveEdit = async () => {
    if (!editingClient) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/clients/${editingClient._id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(editForm) });
      if (res.ok) { setEditingClient(null); fetchClients(); }
    } finally { setSaving(false); }
  };

  const deleteClient = async (id: string) => {
    if (!confirm("Delete this client? This cannot be undone.")) return;
    setDeleting(id);
    try {
      const res = await fetch(`/api/clients/${id}`, { method: "DELETE" });
      if (res.ok) fetchClients();
    } finally { setDeleting(null); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Clients</h2>
        <Link href="/dashboard/crm/clients/new" className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">+ Add Client</Link>
      </div>

      <div className="flex items-center gap-4">
        <input type="text" placeholder="Search clients..." value={search} onChange={(e) => setSearch(e.target.value)} className="rounded-lg border px-3 py-2 text-sm w-full max-w-sm" />
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="rounded-lg border px-3 py-2 text-sm">
          <option value="">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
          <option value="prospect">Prospect</option>
          <option value="archived">Archived</option>
        </select>
      </div>

      <div className="rounded-lg border">
        <table className="w-full">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="p-3 text-left text-sm font-medium">Client</th>
              <th className="p-3 text-left text-sm font-medium">Company</th>
              <th className="p-3 text-left text-sm font-medium">Type</th>
              <th className="p-3 text-left text-sm font-medium">Status</th>
              <th className="p-3 text-left text-sm font-medium">Projects</th>
              <th className="p-3 text-left text-sm font-medium">Total Spent</th>
              <th className="p-3 text-right text-sm font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} className="p-8 text-center text-sm text-muted-foreground">Loading...</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={7} className="p-8 text-center text-sm text-muted-foreground">No clients found.</td></tr>
            ) : (
              filtered.map((client) => (
                <tr key={client._id} className="border-b last:border-0 hover:bg-muted/30">
                  <td className="p-3">
                    <p className="font-medium text-sm">{client.name}</p>
                    <p className="text-xs text-muted-foreground">{client.email}</p>
                  </td>
                  <td className="p-3 text-sm">{client.company || "-"}</td>
                  <td className="p-3 text-sm capitalize">{client.type}</td>
                  <td className="p-3">
                    <span className={`text-xs px-2 py-1 rounded-full ${client.status === "active" ? "bg-green-100 text-green-800" : client.status === "prospect" ? "bg-blue-100 text-blue-800" : "bg-gray-100 text-gray-800"}`}>{client.status}</span>
                  </td>
                  <td className="p-3 text-sm">{client.totalProjects}</td>
                  <td className="p-3 text-sm">${client.totalSpent.toLocaleString()}</td>
                  <td className="p-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => openEdit(client)} className="rounded p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground text-xs" title="Edit">Edit</button>
                      <button onClick={() => deleteClient(client._id)} disabled={deleting === client._id} className="rounded p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive text-xs" title="Delete">
                        {deleting === client._id ? "..." : "Delete"}
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {editingClient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="rounded-lg bg-background p-6 shadow-lg w-full max-w-md space-y-4">
            <h3 className="text-lg font-semibold">Edit Client</h3>
            <input type="text" placeholder="Name" value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} className="w-full rounded-lg border px-3 py-2 text-sm" />
            <input type="email" placeholder="Email" value={editForm.email} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} className="w-full rounded-lg border px-3 py-2 text-sm" />
            <input type="text" placeholder="Phone" value={editForm.phone} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} className="w-full rounded-lg border px-3 py-2 text-sm" />
            <input type="text" placeholder="Company" value={editForm.company} onChange={(e) => setEditForm({ ...editForm, company: e.target.value })} className="w-full rounded-lg border px-3 py-2 text-sm" />
            <select value={editForm.type} onChange={(e) => setEditForm({ ...editForm, type: e.target.value })} className="w-full rounded-lg border px-3 py-2 text-sm">
              <option value="individual">Individual</option>
              <option value="business">Business</option>
              <option value="enterprise">Enterprise</option>
            </select>
            <select value={editForm.status} onChange={(e) => setEditForm({ ...editForm, status: e.target.value })} className="w-full rounded-lg border px-3 py-2 text-sm">
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="prospect">Prospect</option>
              <option value="archived">Archived</option>
            </select>
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setEditingClient(null)} className="rounded-lg border px-4 py-2 text-sm hover:bg-muted">Cancel</button>
              <button onClick={saveEdit} disabled={saving} className="rounded-lg bg-primary px-4 py-2 text-sm text-primary-foreground hover:bg-primary/90 disabled:opacity-50">{saving ? "Saving..." : "Save"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
