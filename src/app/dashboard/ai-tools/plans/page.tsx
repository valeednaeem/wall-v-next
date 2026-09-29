"use client";

import { useState, useEffect, useCallback, FormEvent } from "react";
import { Plus, Loader2, Info } from "lucide-react";
import { toast } from "sonner";
import { formatPrice } from "@/lib/utils";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";

interface Plan {
  _id: string;
  name: string;
  slug: string;
  description?: string;
  monthlyPrice: number;
  yearlyPrice: number;
  includedCredits: number;
  includedExecutions: number;
  features: string[];
  status: string;
  sortOrder: number;
}

const inputCls = "w-full rounded-lg border bg-background px-3 py-2 text-sm";

const EMPTY = {
  name: "",
  description: "",
  monthlyPrice: 0,
  yearlyPrice: 0,
  includedCredits: 0,
  includedExecutions: 0,
  features: [] as string[],
  status: "active",
  sortOrder: 0,
};

export default function AiToolPlansPage() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const fetchPlans = useCallback(() => {
    setLoading(true);
    fetch("/api/ai-tools/plans")
      .then((r) => r.json())
      .then((d) => { if (d.success) setPlans(d.data); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { fetchPlans(); }, [fetchPlans]);

  const openCreate = () => { setEditingId(null); setForm(EMPTY); setError(""); setOpen(true); };

  const openEdit = (p: Plan) => {
    setEditingId(p._id);
    setForm({
      name: p.name,
      description: p.description || "",
      monthlyPrice: p.monthlyPrice,
      yearlyPrice: p.yearlyPrice,
      includedCredits: p.includedCredits,
      includedExecutions: p.includedExecutions,
      features: p.features || [],
      status: p.status,
      sortOrder: p.sortOrder,
    });
    setError("");
    setOpen(true);
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      const res = await fetch(editingId ? `/api/ai-tools/plans/${editingId}` : "/api/ai-tools/plans", {
        method: editingId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || "Failed to save plan");
      toast.success(editingId ? "Plan updated" : "Plan created");
      setOpen(false);
      fetchPlans();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save plan");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this plan?")) return;
    const res = await fetch(`/api/ai-tools/plans/${id}`, { method: "DELETE" });
    if (res.ok) {
      toast.success("Plan deleted");
      fetchPlans();
    } else {
      const d = await res.json().catch(() => ({}));
      toast.error(d.error || "Delete failed");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Plans & Access</h2>
          <p className="text-sm text-muted-foreground">{plans.length} plans controlling tool access</p>
        </div>
        <button onClick={openCreate}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
          <Plus className="h-4 w-4" /> Add Plan
        </button>
      </div>

      <div className="flex items-start gap-2 rounded-lg border bg-muted/50 px-4 py-3 text-sm text-muted-foreground">
        <Info className="h-4 w-4 mt-0.5 shrink-0" />
        <span>Plans power subscription entitlement: users subscribe from tool pages via 2Checkout, and execution enforces plan match plus credit deduction.</span>
      </div>

      {loading ? (
        <div className="grid gap-4 md:grid-cols-3">
          {[0, 1, 2].map((i) => <div key={i} className="h-64 bg-muted rounded-xl animate-pulse" />)}
        </div>
      ) : plans.length === 0 ? (
        <div className="rounded-lg border p-12 text-center text-sm text-muted-foreground">No plans yet.</div>
      ) : (
        <div className="grid gap-4 md:grid-cols-3">
          {plans.map((p) => (
            <div key={p._id} className="rounded-lg border bg-background flex flex-col">
              <div className="px-4 py-3 border-b flex items-start justify-between">
                <div>
                  <div className="font-semibold">{p.name}</div>
                  <div className="text-xs text-muted-foreground">/{p.slug}</div>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full ${p.status === "active" ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"}`}>
                  {p.status}
                </span>
              </div>
              <div className="p-4 space-y-3 text-sm flex-1">
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-bold">{formatPrice(p.monthlyPrice)}</span>
                  <span className="text-muted-foreground">/mo</span>
                </div>
                <div className="text-sm text-muted-foreground">{formatPrice(p.yearlyPrice)}/yr</div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="rounded-lg bg-muted/50 px-3 py-2">
                    <div className="text-muted-foreground">Credits</div>
                    <div className="font-semibold">{p.includedCredits.toLocaleString()}</div>
                  </div>
                  <div className="rounded-lg bg-muted/50 px-3 py-2">
                    <div className="text-muted-foreground">Executions</div>
                    <div className="font-semibold">{p.includedExecutions.toLocaleString()}</div>
                  </div>
                </div>
                {p.description && <p className="text-xs text-muted-foreground">{p.description}</p>}
                {p.features.length > 0 && (
                  <ul className="text-xs space-y-1 list-disc pl-4 text-muted-foreground">
                    {p.features.map((f, i) => <li key={i}>{f}</li>)}
                  </ul>
                )}
              </div>
              <div className="px-4 py-3 border-t flex gap-3 text-sm">
                <button onClick={() => openEdit(p)} className="text-primary hover:underline">Edit</button>
                <button onClick={() => remove(p._id)} className="text-destructive hover:underline">Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit Plan" : "Add Plan"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={submit} className="space-y-4">
            {error && <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</div>}
            <div className="grid gap-1.5">
              <label className="text-sm font-medium">Name *</label>
              <input className={inputCls} required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="grid gap-1.5">
              <label className="text-sm font-medium">Description</label>
              <textarea className={inputCls} rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-1.5">
                <label className="text-sm font-medium">Monthly price ($)</label>
                <input type="number" min={0} step="0.01" className={inputCls} value={form.monthlyPrice}
                  onChange={(e) => setForm({ ...form, monthlyPrice: Number(e.target.value) })} />
              </div>
              <div className="grid gap-1.5">
                <label className="text-sm font-medium">Yearly price ($)</label>
                <input type="number" min={0} step="0.01" className={inputCls} value={form.yearlyPrice}
                  onChange={(e) => setForm({ ...form, yearlyPrice: Number(e.target.value) })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-1.5">
                <label className="text-sm font-medium">Included credits</label>
                <input type="number" min={0} className={inputCls} value={form.includedCredits}
                  onChange={(e) => setForm({ ...form, includedCredits: Number(e.target.value) })} />
              </div>
              <div className="grid gap-1.5">
                <label className="text-sm font-medium">Included executions</label>
                <input type="number" min={0} className={inputCls} value={form.includedExecutions}
                  onChange={(e) => setForm({ ...form, includedExecutions: Number(e.target.value) })} />
              </div>
            </div>
            <div className="grid gap-1.5">
              <label className="text-sm font-medium">Features (one per line)</label>
              <textarea className={inputCls} rows={4} value={form.features.join("\n")}
                onChange={(e) => setForm({ ...form, features: e.target.value.split("\n").map((f) => f.trim()).filter(Boolean) })} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-1.5">
                <label className="text-sm font-medium">Status</label>
                <select className={inputCls} value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                  <option value="active">active</option>
                  <option value="inactive">inactive</option>
                </select>
              </div>
              <div className="grid gap-1.5">
                <label className="text-sm font-medium">Sort order</label>
                <input type="number" className={inputCls} value={form.sortOrder}
                  onChange={(e) => setForm({ ...form, sortOrder: Number(e.target.value) })} />
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <button type="submit" disabled={saving}
                className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                {editingId ? "Save changes" : "Create plan"}
              </button>
              <button type="button" onClick={() => setOpen(false)} className="rounded-lg border px-5 py-2.5 text-sm font-medium hover:bg-muted">
                Cancel
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
