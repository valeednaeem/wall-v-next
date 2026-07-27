"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Plus, Pencil, Trash2, DollarSign, ToggleLeft, ToggleRight,
  GripVertical, Search, Save, X, Loader2
} from "lucide-react";

interface PriceTier {
  name: string;
  price: number;
  features: string[];
}

interface ServicePrice {
  _id: string;
  serviceKey: string;
  name: string;
  category: string;
  description: string;
  type: string;
  basePrice: number;
  currency: string;
  hourlyRate?: number;
  tiers?: PriceTier[];
  features: string[];
  technology: string[];
  estimatedHours?: { min: number; max: number };
  estimatedWeeks?: { min: number; max: number };
  active: boolean;
  displayOrder: number;
  agentVisible: boolean;
  agentDescription?: string;
}

const CATEGORIES = [
  { value: "development", label: "Development" },
  { value: "hosting", label: "Hosting" },
  { value: "domains", label: "Domains" },
  { value: "marketing", label: "Marketing" },
  { value: "design", label: "Design" },
  { value: "ai-automation", label: "AI & Automation" },
  { value: "consulting", label: "Consulting" },
  { value: "other", label: "Other" },
];

const PRICE_TYPES = [
  { value: "fixed", label: "Fixed Price" },
  { value: "hourly", label: "Hourly Rate" },
  { value: "starting-at", label: "Starting At" },
  { value: "tiered", label: "Tiered Pricing" },
];

const emptyForm: Partial<ServicePrice> = {
  serviceKey: "",
  name: "",
  category: "development",
  description: "",
  type: "starting-at",
  basePrice: 0,
  currency: "USD",
  hourlyRate: 0,
  features: [],
  technology: [],
  active: true,
  displayOrder: 0,
  agentVisible: true,
  agentDescription: "",
};

export default function PricingPage() {
  const [prices, setPrices] = useState<ServicePrice[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<Partial<ServicePrice>>(emptyForm);
  const [featureInput, setFeatureInput] = useState("");
  const [techInput, setTechInput] = useState("");
  const [tierNameInput, setTierNameInput] = useState("");
  const [tierPriceInput, setTierPriceInput] = useState(0);
  const [tierFeatureInput, setTierFeatureInput] = useState("");

  const fetchPrices = useCallback(async () => {
    try {
      const res = await fetch("/api/settings/prices");
      const data = await res.json();
      setPrices(data.prices || []);
    } catch {
      console.error("Failed to load prices");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchPrices(); }, [fetchPrices]);

  const filtered = prices.filter((p) => {
    if (filter !== "all" && p.category !== filter) return false;
    if (search && !p.name.toLowerCase().includes(search.toLowerCase()) && !p.serviceKey.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const handleSave = async () => {
    setSaving(true);
    try {
      const method = editingId ? "PUT" : "POST";
      const body = editingId ? { id: editingId, ...form } : form;
      const res = await fetch("/api/settings/prices", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        await fetchPrices();
        setShowForm(false);
        setEditingId(null);
        setForm(emptyForm);
      }
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (price: ServicePrice) => {
    setForm({ ...price });
    setEditingId(price._id);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this price?")) return;
    await fetch(`/api/settings/prices?id=${id}`, { method: "DELETE" });
    await fetchPrices();
  };

  const handleToggleActive = async (price: ServicePrice) => {
    await fetch("/api/settings/prices", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: price._id, active: !price.active }),
    });
    await fetchPrices();
  };

  const addFeature = () => {
    if (featureInput.trim()) {
      setForm({ ...form, features: [...(form.features || []), featureInput.trim()] });
      setFeatureInput("");
    }
  };

  const removeFeature = (i: number) => {
    setForm({ ...form, features: form.features?.filter((_, idx) => idx !== i) });
  };

  const addTech = () => {
    if (techInput.trim()) {
      setForm({ ...form, technology: [...(form.technology || []), techInput.trim()] });
      setTechInput("");
    }
  };

  const removeTech = (i: number) => {
    setForm({ ...form, technology: form.technology?.filter((_, idx) => idx !== i) });
  };

  const addTier = () => {
    if (tierNameInput.trim() && tierPriceInput > 0) {
      setForm({
        ...form,
        tiers: [...(form.tiers || []), { name: tierNameInput.trim(), price: tierPriceInput, features: [] }],
      });
      setTierNameInput("");
      setTierPriceInput(0);
    }
  };

  const removeTier = (i: number) => {
    setForm({ ...form, tiers: form.tiers?.filter((_, idx) => idx !== i) });
  };

  const addTierFeature = (tierIdx: number) => {
    if (tierFeatureInput.trim()) {
      const tiers = [...(form.tiers || [])];
      tiers[tierIdx] = { ...tiers[tierIdx], features: [...tiers[tierIdx].features, tierFeatureInput.trim()] };
      setForm({ ...form, tiers });
      setTierFeatureInput("");
    }
  };

  const formatPrice = (price: number, currency: string = "USD") =>
    new Intl.NumberFormat("en-US", { style: "currency", currency, maximumFractionDigits: 0 }).format(price);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Service Pricing</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage service prices visible to the AI agent and customers</p>
        </div>
        <button
          onClick={() => { setForm(emptyForm); setEditingId(null); setShowForm(true); }}
          className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" /> Add Service
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="rounded-lg border p-4">
          <p className="text-sm text-muted-foreground">Total Services</p>
          <p className="text-2xl font-bold">{prices.length}</p>
        </div>
        <div className="rounded-lg border p-4">
          <p className="text-sm text-muted-foreground">Active</p>
          <p className="text-2xl font-bold text-green-600">{prices.filter((p) => p.active).length}</p>
        </div>
        <div className="rounded-lg border p-4">
          <p className="text-sm text-muted-foreground">Agent Visible</p>
          <p className="text-2xl font-bold text-blue-600">{prices.filter((p) => p.agentVisible).length}</p>
        </div>
        <div className="rounded-lg border p-4">
          <p className="text-sm text-muted-foreground">Categories</p>
          <p className="text-2xl font-bold">{new Set(prices.map((p) => p.category)).size}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search services..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border bg-muted/50 pl-9 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="rounded-lg border bg-background px-3 py-2 text-sm"
        >
          <option value="all">All Categories</option>
          {CATEGORIES.map((c) => (
            <option key={c.value} value={c.value}>{c.label}</option>
          ))}
        </select>
      </div>

      {/* Price Table */}
      <div className="rounded-lg border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="text-left p-3 font-medium">Service</th>
              <th className="text-left p-3 font-medium">Category</th>
              <th className="text-left p-3 font-medium">Type</th>
              <th className="text-left p-3 font-medium">Price</th>
              <th className="text-left p-3 font-medium">Agent</th>
              <th className="text-left p-3 font-medium">Status</th>
              <th className="text-right p-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="p-8 text-center text-muted-foreground">
                  No services found. Add your first service to get started.
                </td>
              </tr>
            ) : (
              filtered.map((price) => (
                <tr key={price._id} className="border-t hover:bg-muted/30">
                  <td className="p-3">
                    <div>
                      <p className="font-medium">{price.name}</p>
                      <p className="text-xs text-muted-foreground">{price.serviceKey}</p>
                    </div>
                  </td>
                  <td className="p-3">
                    <span className="inline-flex items-center rounded-md bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                      {CATEGORIES.find((c) => c.value === price.category)?.label || price.category}
                    </span>
                  </td>
                  <td className="p-3 text-xs">{PRICE_TYPES.find((t) => t.value === price.type)?.label}</td>
                  <td className="p-3 font-medium">
                    {price.type === "hourly" && price.hourlyRate
                      ? `${formatPrice(price.hourlyRate)}/hr`
                      : price.type === "tiered" && price.tiers?.length
                      ? `From ${formatPrice(Math.min(...price.tiers.map((t) => t.price)), price.currency)}`
                      : formatPrice(price.basePrice, price.currency)}
                  </td>
                  <td className="p-3">
                    {price.agentVisible ? (
                      <ToggleRight className="h-5 w-5 text-green-600 cursor-pointer" onClick={() => handleToggleActive(price)} />
                    ) : (
                      <ToggleLeft className="h-5 w-5 text-muted-foreground cursor-pointer" onClick={() => handleToggleActive(price)} />
                    )}
                  </td>
                  <td className="p-3">
                    {price.active ? (
                      <span className="inline-flex items-center rounded-md bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700">Active</span>
                    ) : (
                      <span className="inline-flex items-center rounded-md bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700">Inactive</span>
                    )}
                  </td>
                  <td className="p-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => handleEdit(price)} className="p-1.5 rounded-lg hover:bg-accent text-muted-foreground">
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button onClick={() => handleDelete(price._id)} className="p-1.5 rounded-lg hover:bg-destructive/10 text-destructive">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Add/Edit Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b p-4">
              <h2 className="text-lg font-semibold">{editingId ? "Edit Service" : "Add Service"}</h2>
              <button onClick={() => { setShowForm(false); setEditingId(null); }} className="p-1 hover:bg-accent rounded-lg">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Service Key *</label>
                  <input
                    type="text"
                    value={form.serviceKey || ""}
                    onChange={(e) => setForm({ ...form, serviceKey: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-") })}
                    disabled={!!editingId}
                    placeholder="e.g. web-development"
                    className="mt-1 w-full rounded-lg border px-3 py-2 text-sm disabled:opacity-50"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Display Name *</label>
                  <input
                    type="text"
                    value={form.name || ""}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="e.g. Web Development"
                    className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Category *</label>
                  <select
                    value={form.category || "development"}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                    className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c.value} value={c.value}>{c.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium">Price Type *</label>
                  <select
                    value={form.type || "starting-at"}
                    onChange={(e) => setForm({ ...form, type: e.target.value })}
                    className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
                  >
                    {PRICE_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium">Description</label>
                <textarea
                  value={form.description || ""}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  rows={2}
                  className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="text-sm font-medium">Base Price ($) *</label>
                  <input
                    type="number"
                    value={form.basePrice || 0}
                    onChange={(e) => setForm({ ...form, basePrice: Number(e.target.value) })}
                    className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Hourly Rate ($)</label>
                  <input
                    type="number"
                    value={form.hourlyRate || 0}
                    onChange={(e) => setForm({ ...form, hourlyRate: Number(e.target.value) })}
                    className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Currency</label>
                  <select
                    value={form.currency || "USD"}
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

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Est. Hours (min-max)</label>
                  <div className="flex gap-2 mt-1">
                    <input
                      type="number"
                      value={form.estimatedHours?.min || ""}
                      onChange={(e) => setForm({ ...form, estimatedHours: { ...form.estimatedHours, min: Number(e.target.value) } })}
                      placeholder="min"
                      className="w-full rounded-lg border px-3 py-2 text-sm"
                    />
                    <input
                      type="number"
                      value={form.estimatedHours?.max || ""}
                      onChange={(e) => setForm({ ...form, estimatedHours: { ...form.estimatedHours, max: Number(e.target.value) } })}
                      placeholder="max"
                      className="w-full rounded-lg border px-3 py-2 text-sm"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium">Est. Weeks (min-max)</label>
                  <div className="flex gap-2 mt-1">
                    <input
                      type="number"
                      value={form.estimatedWeeks?.min || ""}
                      onChange={(e) => setForm({ ...form, estimatedWeeks: { ...form.estimatedWeeks, min: Number(e.target.value) } })}
                      placeholder="min"
                      className="w-full rounded-lg border px-3 py-2 text-sm"
                    />
                    <input
                      type="number"
                      value={form.estimatedWeeks?.max || ""}
                      onChange={(e) => setForm({ ...form, estimatedWeeks: { ...form.estimatedWeeks, max: Number(e.target.value) } })}
                      placeholder="max"
                      className="w-full rounded-lg border px-3 py-2 text-sm"
                    />
                  </div>
                </div>
              </div>

              {/* Features */}
              <div>
                <label className="text-sm font-medium">Features</label>
                <div className="flex gap-2 mt-1">
                  <input
                    type="text"
                    value={featureInput}
                    onChange={(e) => setFeatureInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addFeature())}
                    placeholder="Add feature..."
                    className="flex-1 rounded-lg border px-3 py-2 text-sm"
                  />
                  <button onClick={addFeature} type="button" className="px-3 py-2 rounded-lg border text-sm hover:bg-accent">
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
                {form.features && form.features.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {form.features.map((f, i) => (
                      <span key={i} className="inline-flex items-center gap-1 bg-primary/10 text-primary px-2 py-0.5 rounded text-xs">
                        {f}
                        <button onClick={() => removeFeature(i)}><X className="h-3 w-3" /></button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Technologies */}
              <div>
                <label className="text-sm font-medium">Technologies</label>
                <div className="flex gap-2 mt-1">
                  <input
                    type="text"
                    value={techInput}
                    onChange={(e) => setTechInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addTech())}
                    placeholder="Add technology..."
                    className="flex-1 rounded-lg border px-3 py-2 text-sm"
                  />
                  <button onClick={addTech} type="button" className="px-3 py-2 rounded-lg border text-sm hover:bg-accent">
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
                {form.technology && form.technology.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {form.technology.map((t, i) => (
                      <span key={i} className="inline-flex items-center gap-1 bg-secondary text-secondary-foreground px-2 py-0.5 rounded text-xs">
                        {t}
                        <button onClick={() => removeTech(i)}><X className="h-3 w-3" /></button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Tiers */}
              {form.type === "tiered" && (
                <div>
                  <label className="text-sm font-medium">Pricing Tiers</label>
                  <div className="space-y-2 mt-1">
                    {form.tiers?.map((tier, i) => (
                      <div key={i} className="flex items-center gap-2 p-2 rounded border bg-muted/30">
                        <span className="font-medium text-sm flex-1">{tier.name} — {formatPrice(tier.price)}</span>
                        <button onClick={() => removeTier(i)} className="text-destructive"><Trash2 className="h-4 w-4" /></button>
                      </div>
                    ))}
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={tierNameInput}
                        onChange={(e) => setTierNameInput(e.target.value)}
                        placeholder="Tier name"
                        className="flex-1 rounded-lg border px-3 py-2 text-sm"
                      />
                      <input
                        type="number"
                        value={tierPriceInput || ""}
                        onChange={(e) => setTierPriceInput(Number(e.target.value))}
                        placeholder="Price"
                        className="w-24 rounded-lg border px-3 py-2 text-sm"
                      />
                      <button onClick={addTier} type="button" className="px-3 py-2 rounded-lg border text-sm hover:bg-accent">
                        <Plus className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Agent Description */}
              <div>
                <label className="text-sm font-medium">Agent Description</label>
                <p className="text-xs text-muted-foreground mb-1">How the AI agent should describe this service to visitors</p>
                <textarea
                  value={form.agentDescription || ""}
                  onChange={(e) => setForm({ ...form, agentDescription: e.target.value })}
                  rows={2}
                  placeholder="Custom description for the AI agent..."
                  className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
                />
              </div>

              {/* Toggles */}
              <div className="flex items-center gap-6">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.active ?? true}
                    onChange={(e) => setForm({ ...form, active: e.target.checked })}
                    className="rounded"
                  />
                  <span className="text-sm">Active</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.agentVisible ?? true}
                    onChange={(e) => setForm({ ...form, agentVisible: e.target.checked })}
                    className="rounded"
                  />
                  <span className="text-sm">Visible to AI Agent</span>
                </label>
                <div className="flex items-center gap-2 ml-auto">
                  <label className="text-sm">Order:</label>
                  <input
                    type="number"
                    value={form.displayOrder || 0}
                    onChange={(e) => setForm({ ...form, displayOrder: Number(e.target.value) })}
                    className="w-16 rounded-lg border px-2 py-1 text-sm"
                  />
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2 border-t p-4">
              <button
                onClick={() => { setShowForm(false); setEditingId(null); }}
                className="px-4 py-2 rounded-lg border text-sm font-medium hover:bg-accent"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !form.serviceKey || !form.name}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                {editingId ? "Update" : "Create"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
