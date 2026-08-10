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

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">CRM Leads</h2>
        <button className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">+ New Lead</button>
      </div>

      <div className="flex items-center gap-4">
        <input type="text" placeholder="Search leads..." value={search} onChange={(e) => setSearch(e.target.value)} className="rounded-lg border px-3 py-2 text-sm w-full max-w-sm" />
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="rounded-lg border px-3 py-2 text-sm">
          <option value="">All Status</option>
          <option value="new">New</option>
          <option value="contacted">Contacted</option>
          <option value="qualified">Qualified</option>
          <option value="proposal">Proposal</option>
          <option value="negotiation">Negotiation</option>
          <option value="won">Won</option>
          <option value="lost">Lost</option>
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
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} className="p-8 text-center text-sm text-muted-foreground">Loading...</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={5} className="p-8 text-center text-sm text-muted-foreground">No leads found.</td></tr>
            ) : (
              filtered.map((lead) => (
                <tr key={lead._id} className="border-b last:border-0">
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
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
