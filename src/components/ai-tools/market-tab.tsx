"use client";

import { useCallback, useEffect, useState } from "react";
import { Plus, Pencil, Trash2, ExternalLink, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDate } from "@/lib/utils";

interface MarketEntry {
  _id: string;
  competitor: string;
  product: string;
  category?: string;
  url?: string;
  pricing?: string;
  features?: string[];
  targetAudience?: string;
  positioning?: string;
  notes?: string;
  researchedAt: string;
}

const EMPTY_FORM = {
  competitor: "",
  product: "",
  category: "",
  url: "",
  pricing: "",
  features: "",
  targetAudience: "",
  positioning: "",
  notes: "",
  researchedAt: "",
};

export function MarketTab() {
  const [entries, setEntries] = useState<MarketEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/ai-tools/market");
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(body.error || "Failed to load market research.");
        return;
      }
      setEntries(body.data || []);
      setError("");
    } catch {
      setError("Failed to load market research. Please try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const openCreate = () => {
    setEditingId(null);
    setForm({ ...EMPTY_FORM });
    setOpen(true);
  };

  const openEdit = (e: MarketEntry) => {
    setEditingId(e._id);
    setForm({
      competitor: e.competitor,
      product: e.product,
      category: e.category || "",
      url: e.url || "",
      pricing: e.pricing || "",
      features: (e.features || []).join(", "),
      targetAudience: e.targetAudience || "",
      positioning: e.positioning || "",
      notes: e.notes || "",
      researchedAt: e.researchedAt ? e.researchedAt.slice(0, 10) : "",
    });
    setOpen(true);
  };

  const save = async () => {
    if (!form.competitor.trim() || !form.product.trim()) {
      toast.error("Competitor and product are required.");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        competitor: form.competitor.trim(),
        product: form.product.trim(),
        category: form.category.trim() || undefined,
        url: form.url.trim() || undefined,
        pricing: form.pricing.trim() || undefined,
        features: form.features
          .split(",")
          .map((f) => f.trim())
          .filter(Boolean),
        targetAudience: form.targetAudience.trim() || undefined,
        positioning: form.positioning.trim() || undefined,
        notes: form.notes.trim() || undefined,
        researchedAt: form.researchedAt || undefined,
      };
      const res = await fetch(editingId ? `/api/ai-tools/market/${editingId}` : "/api/ai-tools/market", {
        method: editingId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(body.error || "Failed to save entry.");
        return;
      }
      toast.success(editingId ? "Entry updated." : "Entry created.");
      setOpen(false);
      load();
    } catch {
      toast.error("Failed to save entry. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (entry: MarketEntry) => {
    if (!window.confirm(`Delete research entry for "${entry.competitor} — ${entry.product}"?`)) return;
    try {
      const res = await fetch(`/api/ai-tools/market/${entry._id}`, { method: "DELETE" });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        toast.error(body.error || "Failed to delete entry.");
        return;
      }
      toast.success("Entry deleted.");
      load();
    } catch {
      toast.error("Failed to delete entry. Please try again.");
    }
  };

  return (
    <div className="space-y-4">
      <Card className="border-dashed">
        <CardContent className="p-4 text-sm text-muted-foreground">
          External market research — separate from internal Wall-V analytics. Data is recorded
          manually (or by a future research agent); it is not derived from platform usage.
        </CardContent>
      </Card>

      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{entries.length} entries</p>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={load} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
          <Button size="sm" onClick={openCreate}>
            <Plus className="mr-1.5 h-4 w-4" /> New entry
          </Button>
        </div>
      </div>

      {error && (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="p-4 text-sm text-amber-800">{error}</CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Competitor research</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <Skeleton className="h-48 w-full" />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Competitor</TableHead>
                  <TableHead>Product</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Pricing</TableHead>
                  <TableHead>URL</TableHead>
                  <TableHead>Researched</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {entries.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="py-8 text-center text-sm text-muted-foreground">
                      No research entries yet.
                    </TableCell>
                  </TableRow>
                ) : (
                  entries.map((e) => (
                    <TableRow key={e._id}>
                      <TableCell className="font-medium">{e.competitor}</TableCell>
                      <TableCell>{e.product}</TableCell>
                      <TableCell>{e.category || "—"}</TableCell>
                      <TableCell>{e.pricing || "—"}</TableCell>
                      <TableCell>
                        {e.url ? (
                          <a
                            href={e.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-blue-600 hover:underline"
                          >
                            link <ExternalLink className="h-3 w-3" />
                          </a>
                        ) : (
                          "—"
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDate(e.researchedAt)}
                      </TableCell>
                      <TableCell className="text-right">
                        <span className="inline-flex gap-1">
                          <Button variant="ghost" size="icon" aria-label="Edit" onClick={() => openEdit(e)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label="Delete"
                            className="text-red-600 hover:text-red-700"
                            onClick={() => remove(e)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </span>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit entry" : "New research entry"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label htmlFor="m-competitor">Competitor *</Label>
              <Input
                id="m-competitor"
                value={form.competitor}
                onChange={(e) => setForm({ ...form, competitor: e.target.value })}
                placeholder="e.g. Jasper"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="m-product">Product *</Label>
              <Input
                id="m-product"
                value={form.product}
                onChange={(e) => setForm({ ...form, product: e.target.value })}
                placeholder="e.g. Jasper AI"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="m-category">Category</Label>
                <Input
                  id="m-category"
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                  placeholder="writing, code, chat…"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="m-pricing">Pricing</Label>
                <Input
                  id="m-pricing"
                  value={form.pricing}
                  onChange={(e) => setForm({ ...form, pricing: e.target.value })}
                  placeholder="$49/mo"
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="m-url">URL</Label>
              <Input
                id="m-url"
                value={form.url}
                onChange={(e) => setForm({ ...form, url: e.target.value })}
                placeholder="https://…"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="m-features">Features (comma-separated)</Label>
              <Input
                id="m-features"
                value={form.features}
                onChange={(e) => setForm({ ...form, features: e.target.value })}
                placeholder="long-form, brand voice, templates"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="m-audience">Target audience</Label>
              <Input
                id="m-audience"
                value={form.targetAudience}
                onChange={(e) => setForm({ ...form, targetAudience: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="m-positioning">Positioning</Label>
              <Input
                id="m-positioning"
                value={form.positioning}
                onChange={(e) => setForm({ ...form, positioning: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="m-notes">Notes</Label>
              <Textarea
                id="m-notes"
                rows={3}
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="m-date">Researched at</Label>
              <Input
                id="m-date"
                type="date"
                value={form.researchedAt}
                onChange={(e) => setForm({ ...form, researchedAt: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={save} disabled={saving}>
              {saving ? "Saving…" : editingId ? "Save changes" : "Create entry"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
