"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { Save, Loader2, Target, DollarSign, TrendingUp, ArrowRight, RefreshCw, Settings, Search, Filter, XCircle, CheckCircle2, AlertCircle, Plus, Trash2, MoreVertical } from "lucide-react";
import { cn } from "@/lib/utils";

interface ConversionGoal {
  _id?: string;
  name: string;
  eventName: string;
  type: "destination" | "event" | "duration" | "pages_per_session" | "smart";
  value: number;
  currency: string;
  isActive: boolean;
  googleAdsConversionId?: string;
  metaPixelId?: string;
  ga4ConversionName?: string;
  countMethod: "once_per_session" | "every_time";
  attributionWindow: number; // days
  category: "purchase" | "lead" | "sign_up" | "demo" | "contact" | "download" | "custom";
  description: string;
  createdAt?: string;
  updatedAt?: string;
}

const CATEGORIES = [
  "purchase", "lead", "sign_up", "demo", "contact", "download", "custom"
] as const;

export default function ConversionsPage() {
  const { data: session, status } = useSession();
  const [goals, setGoals] = useState<ConversionGoal[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingGoal, setEditingGoal] = useState<ConversionGoal | null>(null);
  const [formData, setFormData] = useState<Partial<ConversionGoal>>({
    name: "",
    eventName: "",
    type: "event",
    value: 0,
    currency: "USD",
    isActive: true,
    googleAdsConversionId: "",
    metaPixelId: "",
    ga4ConversionName: "",
    countMethod: "once_per_session",
    attributionWindow: 30,
    category: "custom",
    description: "",
  });
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    if (status === "loading") return;
    if (status === "unauthenticated") {
      window.location.href = "/login?callbackUrl=/dashboard/marketing/tracking/conversions";
      return;
    }
    fetchGoals();
  }, [status]);

  const fetchGoals = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/marketing/tracking/conversions");
      const data = await res.json();
      if (data.success) {
        setGoals(data.data);
      }
    } catch (error) {
      console.error("Failed to fetch conversion goals:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (goal?: ConversionGoal) => {
    if (goal) {
      setEditingGoal(goal);
      setFormData({ ...goal });
    } else {
      setEditingGoal(null);
      setFormData({
        name: "",
        eventName: "",
        type: "event",
        value: 0,
        currency: "USD",
        isActive: true,
        googleAdsConversionId: "",
        metaPixelId: "",
        ga4ConversionName: "",
        countMethod: "once_per_session",
        attributionWindow: 30,
        category: "custom",
        description: "",
      });
    }
    setShowModal(true);
    setSaveMessage(null);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingGoal(null);
  };

  const handleSave = async () => {
    if (!formData.name || !formData.eventName) {
      setSaveMessage({ type: "error", text: "Name and Event Name are required" });
      return;
    }
    setSaving(true);
    setSaveMessage(null);
    try {
      const url = editingGoal
        ? `/api/marketing/tracking/conversions/${editingGoal._id}`
        : "/api/marketing/tracking/conversions";
      const method = editingGoal ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      if (res.status === 401) { window.location.href = "/login?callbackUrl=/dashboard/marketing/tracking/conversions"; return; }
      const data = await res.json();
      if (res.ok && data.success) {
        setSaveMessage({ type: "success", text: editingGoal ? "Conversion goal updated" : "Conversion goal created" });
        fetchGoals();
        handleCloseModal();
      } else {
        setSaveMessage({ type: "error", text: data.error || "Failed to save" });
      }
    } catch {
      setSaveMessage({ type: "error", text: "Network error" });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (goalId: string) => {
    if (!confirm("Delete this conversion goal?")) return;
    try {
      const res = await fetch(`/api/marketing/tracking/conversions/${goalId}`, { method: "DELETE" });
      if (res.ok) {
        fetchGoals();
      }
    } catch {
      console.error("Delete failed");
    }
  };

  const formatCurrency = (num: number) => {
    return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 0 }).format(num);
  };

  if (status === "loading") {
    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold">Conversion Tracking</h2>
        <div className="rounded-lg border p-6 animate-pulse space-y-4">
          <div className="h-4 bg-muted rounded w-1/4" />
          <div className="h-4 bg-muted rounded w-1/2" />
        </div>
      </div>
    );
  }

  if (!session) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Target className="h-6 w-6 text-primary" />
            Conversion Tracking
          </h2>
          <p className="text-sm text-muted-foreground mt-1">Define conversion goals, assign values, and map to Google Ads & Meta Pixel</p>
        </div>
        <button onClick={() => handleOpenModal()} className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/90">
          <Plus className="h-4 w-4" />
          New Conversion Goal
        </button>
      </div>

      {saveMessage && (
        <div className={`p-3 rounded-lg text-sm ${saveMessage.type === "success" ? "bg-green-50 text-green-700 border border-green-200" : "bg-red-50 text-red-700 border border-red-200"}`}>
          {saveMessage.text}
        </div>
      )}

      {/* Goals Table */}
      <div className="rounded-lg border overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-sm text-muted-foreground">Loading...</div>
        ) : goals.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            <Target className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
            <p>No conversion goals defined yet</p>
            <button onClick={() => handleOpenModal()} className="mt-3 inline-flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/90">
              <Plus className="h-4 w-4" />
              Create First Goal
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Goal</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Event</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Category</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Value</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Type</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Status</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Platform Mapping</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {goals.map((goal) => (
                  <tr key={goal._id} className="hover:bg-accent/50">
                    <td className="px-4 py-3">
                      <div className="font-medium text-sm">{goal.name}</div>
                      <div className="text-xs text-muted-foreground">{goal.description}</div>
                    </td>
                    <td className="px-4 py-3 font-mono text-sm">{goal.eventName}</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                        {goal.category}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm font-medium">{formatCurrency(goal.value)}</td>
                    <td className="px-4 py-3 text-sm capitalize">{goal.type.replace("_", " ")}</td>
                    <td className="px-4 py-3">
                      <span className={cn("inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium",
                        goal.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-700"
                      )}>
                        {goal.isActive ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                        {goal.isActive ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        {goal.googleAdsConversionId && (
                          <span className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-green-100 text-green-700 rounded">
                            <DollarSign className="h-3 w-3" />
                            Ads
                          </span>
                        )}
                        {goal.metaPixelId && (
                          <span className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded">
                            <Target className="h-3 w-3" />
                            Pixel
                          </span>
                        )}
                        {goal.ga4ConversionName && (
                          <span className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-purple-100 text-purple-700 rounded">
                            <TrendingUp className="h-3 w-3" />
                            GA4
                          </span>
                        )}
                        {!goal.googleAdsConversionId && !goal.metaPixelId && !goal.ga4ConversionName && (
                          <span className="text-xs text-muted-italic">Not mapped</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <button onClick={() => handleOpenModal(goal)} className="inline-flex items-center gap-1 text-xs px-2 py-1 border rounded hover:bg-accent">
                        <MoreVertical className="h-3 w-3" /> Edit
                      </button>
                      <button onClick={() => handleDelete(goal._id!)} className="ml-2 text-red-500 hover:text-red-700 p-1">
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Conversion Goal Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b p-4 flex items-center justify-between">
              <h3 className="font-semibold">{editingGoal ? "Edit Conversion Goal" : "New Conversion Goal"}</h3>
              <button onClick={handleCloseModal} className="p-1 hover:bg-muted rounded">
                <MoreVertical className="h-5 w-5" />
              </button>
            </div>
            <div className="p-6 space-y-6">
              <div className="space-y-4 border-b pb-6">
                <h4 className="font-medium">Basic Information</h4>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">Goal Name <span className="text-red-500">*</span></label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
                      placeholder="e.g., Purchase Completed"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Event Name (GA4) <span className="text-red-500">*</span></label>
                    <input
                      type="text"
                      value={formData.eventName}
                      onChange={(e) => setFormData({ ...formData, eventName: e.target.value })}
                      className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
                      placeholder="e.g., purchase"
                    />
                    <p className="text-xs text-muted-foreground mt-1">Must match the event name in GA4/Events Tracking</p>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium">Description</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
                    rows={2}
                    placeholder="What triggers this conversion and why it matters"
                  />
                </div>
                <div className="grid md:grid-cols-3 gap-4">
                  <div>
                    <label className="text-sm font-medium">Category</label>
                    <select
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value as ConversionGoal["category"] })}
                      className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
                    >
                      {CATEGORIES.map((c) => (
                        <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Conversion Type</label>
                    <select
                      value={formData.type}
                      onChange={(e) => setFormData({ ...formData, type: e.target.value as ConversionGoal["type"] })}
                      className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
                    >
                      <option value="event">Event</option>
                      <option value="destination">Destination URL</option>
                      <option value="duration">Session Duration</option>
                      <option value="pages_per_session">Pages per Session</option>
                      <option value="smart">Smart Goal</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Count Method</label>
                    <select
                      value={formData.countMethod}
                      onChange={(e) => setFormData({ ...formData, countMethod: e.target.value as ConversionGoal["countMethod"] })}
                      className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
                    >
                      <option value="once_per_session">Once per Session</option>
                      <option value="every_time">Every Time</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="space-y-4 border-b pb-6">
                <h4 className="font-medium">Value & Attribution</h4>
                <div className="grid md:grid-cols-3 gap-4">
                  <div>
                    <label className="text-sm font-medium">Conversion Value</label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.value}
                      onChange={(e) => setFormData({ ...formData, value: parseFloat(e.target.value) || 0 })}
                      className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
                      placeholder="100.00"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Currency</label>
                    <select
                      value={formData.currency}
                      onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                      className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
                    >
                      <option value="USD">USD</option>
                      <option value="EUR">EUR</option>
                      <option value="GBP">GBP</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Attribution Window (days)</label>
                    <input
                      type="number"
                      value={formData.attributionWindow}
                      onChange={(e) => setFormData({ ...formData, attributionWindow: parseInt(e.target.value) || 30 })}
                      className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
                      min="1"
                      max="90"
                    />
                    <p className="text-xs text-muted-foreground mt-1">How long after click to attribute conversion</p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="font-medium">Platform Mapping</h4>
                <div className="grid md:grid-cols-3 gap-4">
                  <div>
                    <label className="text-sm font-medium">Google Ads Conversion ID</label>
                    <input
                      type="text"
                      value={formData.googleAdsConversionId}
                      onChange={(e) => setFormData({ ...formData, googleAdsConversionId: e.target.value })}
                      className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
                      placeholder="AW-123456789/ABCDefGhIjK"
                    />
                    <p className="text-xs text-muted-foreground mt-1">From Google Ads {'>'} Conversions {'>'} Settings</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Meta Pixel ID</label>
                    <input
                      type="text"
                      value={formData.metaPixelId}
                      onChange={(e) => setFormData({ ...formData, metaPixelId: e.target.value })}
                      className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
                      placeholder="1234567890123456"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">GA4 Conversion Name</label>
                    <input
                      type="text"
                      value={formData.ga4ConversionName}
                      onChange={(e) => setFormData({ ...formData, ga4ConversionName: e.target.value })}
                      className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
                      placeholder="purchase"
                    />
                    <p className="text-xs text-muted-foreground mt-1">Mark as conversion in GA4 Admin</p>
                  </div>
                </div>
              </div>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                />
                <span className="text-sm">Active (track this conversion)</span>
              </label>

              <div className="flex justify-end gap-3 pt-4 border-t">
                <button onClick={handleCloseModal} className="px-4 py-2 border rounded-lg hover:bg-accent">
                  Cancel
                </button>
                <button onClick={handleSave} disabled={saving} className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg disabled:opacity-50">
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  {saving ? "Saving..." : editingGoal ? "Update Goal" : "Create Goal"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}