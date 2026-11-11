"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, Pencil, Trash2, Loader2 } from "lucide-react";

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

const STATUS_OPTIONS = ["new", "contacted", "qualified", "proposal", "negotiation", "won", "lost"];

const STATUS_VARIANTS: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  new: "default",
  contacted: "secondary",
  qualified: "outline",
  proposal: "outline",
  negotiation: "outline",
  won: "default",
  lost: "destructive",
};

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const [editForm, setEditForm] = useState({ name: "", email: "", phone: "", company: "", status: "new", score: 0, notes: "" });
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams();
    if (statusFilter && statusFilter !== "all") params.set("status", statusFilter);
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

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search leads..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                {STATUS_OPTIONS.map((s) => (
                  <SelectItem key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Lead</TableHead>
                <TableHead>Company</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Score</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-4 w-[150px]" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-[100px]" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-[80px]" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-[70px]" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-[40px]" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-[100px]" /></TableCell>
                  </TableRow>
                ))
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="p-8 text-center text-sm text-muted-foreground">No leads found.</TableCell>
                </TableRow>
              ) : (
                filtered.map((lead) => (
                  <TableRow key={lead._id}>
                    <TableCell>
                      <p className="font-medium text-sm">{lead.name}</p>
                      <p className="text-xs text-muted-foreground">{lead.email}</p>
                    </TableCell>
                    <TableCell className="text-sm">{lead.company || "-"}</TableCell>
                    <TableCell className="text-sm capitalize">{lead.source}</TableCell>
                    <TableCell>
                      <Badge variant={STATUS_VARIANTS[lead.status] || "outline"}>{lead.status}</Badge>
                    </TableCell>
                    <TableCell className="text-sm">{lead.score}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        {lead.status === "new" && (
                          <Button variant="ghost" size="sm" onClick={() => updateStatus(lead._id, "contacted")}>
                            Contacted
                          </Button>
                        )}
                        {lead.status === "contacted" && (
                          <Button variant="ghost" size="sm" onClick={() => updateStatus(lead._id, "qualified")}>
                            Qualify
                          </Button>
                        )}
                        <Button variant="ghost" size="icon" onClick={() => openEdit(lead)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => deleteLead(lead._id)} disabled={deleting === lead._id}>
                          {deleting === lead._id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4 text-destructive" />}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={!!editingLead} onOpenChange={() => setEditingLead(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Lead</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Input placeholder="Name" value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} />
            <Input placeholder="Email" type="email" value={editForm.email} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} />
            <Input placeholder="Phone" value={editForm.phone} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} />
            <Input placeholder="Company" value={editForm.company} onChange={(e) => setEditForm({ ...editForm, company: e.target.value })} />
            <Select value={editForm.status} onValueChange={(val) => setEditForm({ ...editForm, status: val })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((s) => (
                  <SelectItem key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">Score (0-100)</label>
              <Input type="number" min={0} max={100} value={editForm.score} onChange={(e) => setEditForm({ ...editForm, score: parseInt(e.target.value) || 0 })} />
            </div>
            <textarea
              placeholder="Notes (internal)"
              value={editForm.notes}
              onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm min-h-[80px]"
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingLead(null)}>Cancel</Button>
            <Button onClick={saveEdit} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
