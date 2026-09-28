"use client";

import { useState, useEffect, useCallback, FormEvent } from "react";
import { Plus, Trash2, Loader2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";

interface ProviderModel {
  name: string;
  label?: string;
  enabled: boolean;
  inputCostPer1k?: number;
  outputCostPer1k?: number;
  maxTokens?: number;
}

interface Provider {
  _id: string;
  name: string;
  slug: string;
  type: string;
  status: string;
  isDefault: boolean;
  envKeyName?: string;
  configured?: boolean;
  models: ProviderModel[];
  rateLimit?: { requestsPerMinute?: number };
  notes?: string;
}

const TYPE_OPTIONS = ["openai", "anthropic", "google", "elevenlabs", "omnirouter", "custom"];
const inputCls = "w-full rounded-lg border bg-background px-3 py-2 text-sm";

const EMPTY_FORM = {
  name: "",
  type: "openai",
  status: "active",
  isDefault: false,
  envKeyName: "",
  notes: "",
  models: [] as ProviderModel[],
  rateLimit: undefined as number | undefined,
};

export default function AiToolProvidersPage() {
  const [providers, setProviders] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchProviders = useCallback(() => {
    setLoading(true);
    fetch("/api/ai-tools/providers")
      .then((r) => r.json())
      .then((d) => { if (d.success) setProviders(d.data); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { fetchProviders(); }, [fetchProviders]);

  const openCreate = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setError("");
    setOpen(true);
  };

  const openEdit = (p: Provider) => {
    setEditingId(p._id);
    setForm({
      name: p.name,
      type: p.type,
      status: p.status,
      isDefault: p.isDefault,
      envKeyName: p.envKeyName || "",
      notes: p.notes || "",
      models: p.models || [],
      rateLimit: p.rateLimit?.requestsPerMinute,
    });
    setError("");
    setOpen(true);
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      const payload = {
        name: form.name,
        type: form.type,
        status: form.status,
        isDefault: form.isDefault,
        envKeyName: form.envKeyName || undefined,
        notes: form.notes || undefined,
        models: form.models,
        rateLimit: form.rateLimit != null ? { requestsPerMinute: form.rateLimit } : undefined,
      };
      const res = await fetch(editingId ? `/api/ai-tools/providers/${editingId}` : "/api/ai-tools/providers", {
        method: editingId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || "Failed to save provider");
      toast.success(editingId ? "Provider updated" : "Provider created");
      setOpen(false);
      fetchProviders();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save provider");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this provider?")) return;
    setDeletingId(id);
    try {
      const res = await fetch(`/api/ai-tools/providers/${id}`, { method: "DELETE" });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(d.error || "Delete failed");
      toast.success("Provider deleted");
      fetchProviders();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Delete failed");
    } finally {
      setDeletingId(null);
    }
  };

  const updateModel = (idx: number, patch: Partial<ProviderModel>) => {
    setForm((f) => ({ ...f, models: f.models.map((m, i) => (i === idx ? { ...m, ...patch } : m)) }));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Providers</h2>
          <p className="text-sm text-muted-foreground">{providers.length} AI providers</p>
        </div>
        <button onClick={openCreate}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
          <Plus className="h-4 w-4" /> Add Provider
        </button>
      </div>

      <div className="flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
        <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
        <span>API keys are read from environment variables and never displayed. A green ✓ means the env var is present on this server.</span>
      </div>

      {loading ? (
        <div className="grid gap-4 md:grid-cols-2">
          {[0, 1].map((i) => <div key={i} className="h-48 bg-muted rounded-xl animate-pulse" />)}
        </div>
      ) : providers.length === 0 ? (
        <div className="rounded-lg border p-12 text-center text-sm text-muted-foreground">No providers yet. Add one to power tools.</div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {providers.map((p) => (
            <div key={p._id} className="rounded-lg border bg-background">
              <div className="flex items-start justify-between px-4 py-3 border-b">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm">{p.name}</span>
                    {p.isDefault && <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary">Default</span>}
                    <span className={cn("text-xs px-2 py-0.5 rounded-full",
                      p.status === "active" ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800")}>
                      {p.status}
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground mt-1 capitalize">{p.type} · {p.slug}</div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => openEdit(p)} className="text-sm text-primary hover:underline">Edit</button>
                  <button onClick={() => remove(p._id)} disabled={deletingId === p._id} className="text-sm text-destructive hover:underline disabled:opacity-50">
                    {deletingId === p._id ? "..." : "Delete"}
                  </button>
                </div>
              </div>
              <div className="px-4 py-3 space-y-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Env var</span>
                  <span className="font-mono text-xs">{p.envKeyName || "—"}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Configured</span>
                  <span className={p.configured ? "text-green-600 font-medium" : "text-red-500 font-medium"}>
                    {p.configured ? "✓ yes" : "✗ no"}
                  </span>
                </div>
                {p.models.length > 0 && (
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="text-muted-foreground border-b">
                        <th className="text-left py-1 font-medium">Model</th>
                        <th className="text-center py-1 font-medium">On</th>
                        <th className="text-right py-1 font-medium">In $/1k</th>
                        <th className="text-right py-1 font-medium">Out $/1k</th>
                      </tr>
                    </thead>
                    <tbody>
                      {p.models.map((m) => (
                        <tr key={m.name} className="border-b last:border-0">
                          <td className="py-1">{m.label || m.name}</td>
                          <td className="py-1 text-center">{m.enabled ? "✓" : "—"}</td>
                          <td className="py-1 text-right">{m.inputCostPer1k ?? "—"}</td>
                          <td className="py-1 text-right">{m.outputCostPer1k ?? "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit Provider" : "Add Provider"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={submit} className="space-y-4">
            {error && <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</div>}
            <div className="grid gap-1.5">
              <label className="text-sm font-medium">Name *</label>
              <input className={inputCls} required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-1.5">
                <label className="text-sm font-medium">Type</label>
                <select className={inputCls} value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                  {TYPE_OPTIONS.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div className="grid gap-1.5">
                <label className="text-sm font-medium">Status</label>
                <select className={inputCls} value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                  <option value="active">active</option>
                  <option value="inactive">inactive</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-1.5">
                <label className="text-sm font-medium">Env var name</label>
                <input className={inputCls} placeholder="OPENAI_API_KEY" value={form.envKeyName}
                  onChange={(e) => setForm({ ...form, envKeyName: e.target.value })} />
                <p className="text-xs text-muted-foreground">Key value is never shown or stored in DB.</p>
              </div>
              <div className="grid gap-1.5">
                <label className="text-sm font-medium">Rate limit (req/min)</label>
                <input type="number" min={0} className={inputCls} value={form.rateLimit ?? ""}
                  onChange={(e) => setForm({ ...form, rateLimit: e.target.value === "" ? undefined : Number(e.target.value) })} />
              </div>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={form.isDefault} onChange={(e) => setForm({ ...form, isDefault: e.target.checked })} />
              Make this the default provider (unsets others)
            </label>

            <div className="grid gap-1.5">
              <label className="text-sm font-medium">Models</label>
              <div className="space-y-2">
                {form.models.map((m, i) => (
                  <div key={i} className="grid grid-cols-[1fr,1fr,70px,70px,80px,70px,32px] gap-2 items-center">
                    <input className={inputCls} placeholder="model id" value={m.name} onChange={(e) => updateModel(i, { name: e.target.value })} />
                    <input className={inputCls} placeholder="label" value={m.label || ""} onChange={(e) => updateModel(i, { label: e.target.value })} />
                    <input type="number" step="0.000001" className={inputCls} placeholder="in $" value={m.inputCostPer1k ?? ""}
                      onChange={(e) => updateModel(i, { inputCostPer1k: e.target.value === "" ? undefined : Number(e.target.value) })} />
                    <input type="number" step="0.000001" className={inputCls} placeholder="out $" value={m.outputCostPer1k ?? ""}
                      onChange={(e) => updateModel(i, { outputCostPer1k: e.target.value === "" ? undefined : Number(e.target.value) })} />
                    <input type="number" className={inputCls} placeholder="max tok" value={m.maxTokens ?? ""}
                      onChange={(e) => updateModel(i, { maxTokens: e.target.value === "" ? undefined : Number(e.target.value) })} />
                    <label className="flex items-center justify-center gap-1 text-xs">
                      <input type="checkbox" checked={m.enabled} onChange={(e) => updateModel(i, { enabled: e.target.checked })} />
                      on
                    </label>
                    <button type="button" onClick={() => setForm((f) => ({ ...f, models: f.models.filter((_, idx) => idx !== i) }))}
                      className="text-destructive"><Trash2 className="h-4 w-4" /></button>
                  </div>
                ))}
                <button type="button"
                  onClick={() => setForm((f) => ({ ...f, models: [...f.models, { name: "", enabled: true }] }))}
                  className="inline-flex items-center gap-1 text-sm text-primary hover:underline">
                  <Plus className="h-3 w-3" /> Add model
                </button>
              </div>
            </div>

            <div className="grid gap-1.5">
              <label className="text-sm font-medium">Notes</label>
              <textarea className={inputCls} rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </div>

            <div className="flex gap-3 pt-2">
              <button type="submit" disabled={saving}
                className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                {editingId ? "Save changes" : "Create provider"}
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
