"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { Save, Loader2, Plus, Trash2, Eye, EyeOff, MoreVertical, CheckCircle2, AlertCircle, Target, Zap, MousePointer, Keyboard, Share2, ShoppingBag, DollarSign, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

interface EventDefinition {
  _id?: string;
  eventName: string;
  displayName: string;
  description: string;
  category: "page_view" | "click" | "form_submit" | "download" | "video_play" | "scroll" | "engagement" | "conversion" | "ecommerce" | "custom";
  parameters: Array<{
    name: string;
    type: "string" | "number" | "boolean" | "json";
    required: boolean;
    description: string;
  }>;
  triggers: Array<{
    type: "auto" | "manual" | "data_layer" | "gtm";
    selector?: string;
    event?: string;
    condition?: string;
  }>;
  isActive: boolean;
  isSystem: boolean;
  googleAdsConversionId?: string;
  metaPixelId?: string;
  ga4EventName?: string;
}

const CATEGORIES = [
  "page_view", "click", "form_submit", "download", "video_play",
  "scroll", "engagement", "conversion", "ecommerce", "custom"
] as const;

const EVENT_NAMES = [
  { value: "generate_lead", label: "Generate Lead", category: "conversion" as const },
  { value: "contact_form_submit", label: "Contact Form Submit", category: "form_submit" as const },
  { value: "demo_requested", label: "Demo Requested", category: "conversion" as const },
  { value: "sign_up", label: "Sign Up", category: "conversion" as const },
  { value: "login", label: "Login", category: "engagement" as const },
  { value: "begin_checkout", label: "Begin Checkout", category: "ecommerce" as const },
  { value: "add_to_cart", label: "Add to Cart", category: "ecommerce" as const },
  { value: "purchase", label: "Purchase", category: "ecommerce" as const },
  { value: "project_created", label: "Project Created", category: "conversion" as const },
  { value: "ai_conversation_started", label: "AI Conversation Started", category: "engagement" as const },
  { value: "voice_call_started", label: "Voice Call Started", category: "engagement" as const },
  { value: "file_download", label: "File Download", category: "download" as const },
  { value: "video_play", label: "Video Play", category: "video_play" as const },
  { value: "scroll_depth", label: "Scroll Depth", category: "scroll" as const },
  { value: "cta_click", label: "CTA Click", category: "click" as const },
] as const;

export default function EventsTrackingPage() {
  const { data: session, status } = useSession();
  const [events, setEvents] = useState<EventDefinition[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingEvent, setEditingEvent] = useState<EventDefinition | null>(null);
  const [formData, setFormData] = useState<Partial<EventDefinition>>({
    eventName: "",
    displayName: "",
    description: "",
    category: "custom",
    parameters: [],
    triggers: [{ type: "auto" }],
    isActive: true,
    metaPixelId: "",
    ga4EventName: "",
  });
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    if (status === "loading") return;
    if (status === "unauthenticated") {
      window.location.href = "/login?callbackUrl=/dashboard/marketing/tracking/events";
      return;
    }
    fetchEvents();
  }, [status]);

  const fetchEvents = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/marketing/tracking/events");
      const data = await res.json();
      if (data.success) {
        setEvents(data.data);
      }
    } catch (error) {
      console.error("Failed to fetch events:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (event?: EventDefinition) => {
    if (event) {
      setEditingEvent(event);
      setFormData({ ...event });
    } else {
      setEditingEvent(null);
      setFormData({
        eventName: "",
        displayName: "",
        description: "",
        category: "custom",
        parameters: [],
        triggers: [{ type: "auto" }],
        isActive: true,
        metaPixelId: "",
        ga4EventName: "",
      });
    }
    setShowModal(true);
    setSaveMessage(null);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingEvent(null);
  };

  const handleSave = async () => {
    setSaving(true);
    setSaveMessage(null);
    try {
      const url = editingEvent
        ? `/api/marketing/tracking/events/${editingEvent._id}`
        : "/api/marketing/tracking/events";
      const method = editingEvent ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      if (res.status === 401) { window.location.href = "/login?callbackUrl=/dashboard/marketing/tracking/events"; return; }
      const data = await res.json();
      if (res.ok && data.success) {
        setSaveMessage({ type: "success", text: editingEvent ? "Event updated" : "Event created" });
        fetchEvents();
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

  const handleDelete = async (eventId: string) => {
    if (!confirm("Delete this event definition?")) return;
    try {
      const res = await fetch(`/api/marketing/tracking/events/${eventId}`, { method: "DELETE" });
      if (res.ok) {
        fetchEvents();
      }
    } catch {
      console.error("Delete failed");
    }
  };

  const addParameter = () => {
    setFormData((prev) => ({
      ...prev,
      parameters: [...(prev.parameters || []), { name: "", type: "string", required: false, description: "" }],
    }));
  };

  const removeParameter = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      parameters: (prev.parameters || []).filter((_, i) => i !== index),
    }));
  };

  const addTrigger = () => {
    setFormData((prev) => ({
      ...prev,
      triggers: [...(prev.triggers || []), { type: "auto" }],
    }));
  };

  const removeTrigger = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      triggers: (prev.triggers || []).filter((_, i) => i !== index),
    }));
  };

  if (status === "loading") {
    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold">Events Tracking</h2>
        <div className="rounded-lg border p-6 animate-pulse space-y-4">
          <div className="h-4 bg-muted rounded w-1/4" />
          <div className="h-4 bg-muted rounded w-1/2" />
        </div>
      </div>
    );
  }

  if (!session) return null;

  const systemEvents = events.filter((e) => e.isSystem);
  const customEvents = events.filter((e) => !e.isSystem);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Target className="h-6 w-6 text-primary" />
            Events Tracking
          </h2>
          <p className="text-sm text-muted-foreground mt-1">Define, manage, and monitor custom analytics events across GA4 and Meta Pixel</p>
        </div>
        <button onClick={() => handleOpenModal()} className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/90">
          <Plus className="h-4 w-4" />
          New Event
        </button>
      </div>

      {saveMessage && (
        <div className={`p-3 rounded-lg text-sm ${saveMessage.type === "success" ? "bg-green-50 text-green-700 border border-green-200" : "bg-red-50 text-red-700 border border-red-200"}`}>
          {saveMessage.text}
        </div>
      )}

      {/* System Events */}
      <div className="rounded-lg border p-6">
        <h3 className="font-semibold mb-4 flex items-center gap-2">
          <Zap className="h-5 w-5 text-purple-500" />
          System Events (Auto-tracked)
        </h3>
        <p className="text-sm text-muted-foreground mb-4">These events are automatically tracked by Wall-V. You can map them to GA4/Ads conversion IDs.</p>
        <div className="space-y-2">
          {systemEvents.map((event) => (
            <div key={event._id || event.eventName} className="flex items-center justify-between p-3 rounded-lg border hover:bg-accent/50">
              <div className="flex items-center gap-3">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-700">
                  {event.eventName}
                </span>
                <span className="text-sm text-muted-foreground">{event.displayName}</span>
              </div>
              <div className="flex items-center gap-2">
                {event.ga4EventName && (
                  <span className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded">
                    <Target className="h-3 w-3" />
                    GA4: {event.ga4EventName}
                  </span>
                )}
                <button
                  onClick={() => handleOpenModal(event)}
                  className="inline-flex items-center gap-1 text-xs px-2 py-1 border rounded hover:bg-accent"
                >
                  <MoreVertical className="h-3 w-3" /> Map
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Custom Events */}
      <div className="rounded-lg border p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold flex items-center gap-2">
            <MousePointer className="h-5 w-5 text-green-500" />
            Custom Events
          </h3>
        </div>
        {customEvents.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Plus className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
            <p>No custom events defined yet</p>
            <button onClick={() => handleOpenModal()} className="mt-3 inline-flex items-center gap-2 text-sm border rounded-lg px-3 py-2 hover:bg-accent transition-colors">
              <Plus className="h-4 w-4" />
              Create First Event
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {customEvents.map((event) => (
              <div key={event._id} className="flex items-center justify-between p-3 rounded-lg border hover:bg-accent/50">
                <div className="flex items-center gap-3">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                    {event.eventName}
                  </span>
                  <div>
                    <p className="font-medium text-sm">{event.displayName}</p>
                    <p className="text-xs text-muted-foreground">{event.description}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={cn("inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium",
                    event.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-700"
                  )}>
                    {event.isActive ? <CheckCircle2 className="h-3 w-3" /> : <AlertCircle className="h-3 w-3" />}
                    {event.isActive ? "Active" : "Inactive"}
                  </span>
                  <button onClick={() => handleOpenModal(event)} className="inline-flex items-center gap-1 text-xs px-2 py-1 border rounded hover:bg-accent">
                    <MoreVertical className="h-3 w-3" /> Edit
                  </button>
                  <button onClick={() => handleDelete(event._id!)} className="text-red-500 hover:text-red-700 p-1">
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Event Builder Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b p-4 flex items-center justify-between">
              <h3 className="font-semibold">{editingEvent ? "Edit Event" : "New Event"}</h3>
              <button onClick={handleCloseModal} className="p-1 hover:bg-muted rounded">
                <MoreVertical className="h-5 w-5" />
              </button>
            </div>
            <div className="p-6 space-y-6">
              {/* Basic Info */}
              <div className="space-y-4 border-b pb-6">
                <h4 className="font-medium">Basic Information</h4>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">Event Name (GA4 key) <span className="text-red-500">*</span></label>
                    <input
                      type="text"
                      value={formData.eventName}
                      onChange={(e) => setFormData({ ...formData, eventName: e.target.value })}
                      className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
                      placeholder="generate_lead"
                    />
                    <p className="text-xs text-muted-foreground mt-1">Lowercase with underscores. Used in dataLayer.push()</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Display Name</label>
                    <input
                      type="text"
                      value={formData.displayName}
                      onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                      className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
                      placeholder="Generate Lead"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium">Description</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
                    rows={2}
                    placeholder="What triggers this event and what data it captures"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Category</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value as EventDefinition["category"] })}
                    className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c}>{c.replace("_", " ")}</option>
                    ))}
                  </select>
                </div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.isActive}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                    className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                  />
                  <span className="text-sm">Active (track this event)</span>
                </label>
              </div>

              {/* Platform Mapping */}
              <div className="space-y-4 border-b pb-6">
                <h4 className="font-medium">Platform Mapping</h4>
                <div className="grid md:grid-cols-3 gap-4">
                  <div>
                    <label className="text-sm font-medium">GA4 Event Name</label>
                    <input
                      type="text"
                      value={formData.ga4EventName}
                      onChange={(e) => setFormData({ ...formData, ga4EventName: e.target.value })}
                      className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
                      placeholder="generate_lead"
                    />
                    <p className="text-xs text-muted-foreground mt-1">Defaults to Event Name if empty</p>
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
                </div>
              </div>

              {/* Parameters */}
              <div className="space-y-4 border-b pb-6">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium">Event Parameters</h4>
                  <button onClick={addParameter} className="inline-flex items-center gap-1 text-xs px-2 py-1 border rounded hover:bg-accent">
                    <Plus className="h-3 w-3" /> Add
                  </button>
                </div>
                {formData.parameters?.map((param, index) => (
                  <div key={index} className="flex items-start gap-2 p-3 rounded-lg border bg-muted/30">
                    <div className="flex-1">
                      <input
                        type="text"
                        value={param.name}
                        onChange={(e) => {
                          const params = [...(formData.parameters || [])];
                          params[index] = { ...params[index], name: e.target.value };
                          setFormData({ ...formData, parameters: params });
                        }}
                        className="w-full rounded-lg border px-3 py-2 text-sm"
                        placeholder="parameter_name"
                      />
                    </div>
                    <div className="w-32">
                      <select
                        value={param.type}
                        onChange={(e) => {
                          const params = [...(formData.parameters || [])];
                          params[index] = { ...params[index], type: e.target.value as "string" | "number" | "boolean" | "json" };
                          setFormData({ ...formData, parameters: params });
                        }}
                        className="w-full rounded-lg border px-3 py-2 text-sm"
                      >
                        <option value="string">String</option>
                        <option value="number">Number</option>
                        <option value="boolean">Boolean</option>
                        <option value="json">JSON</option>
                      </select>
                    </div>
                    <div className="flex-1">
                      <input
                        type="text"
                        value={param.description}
                        onChange={(e) => {
                          const params = [...(formData.parameters || [])];
                          params[index] = { ...params[index], description: e.target.value };
                          setFormData({ ...formData, parameters: params });
                        }}
                        className="w-full rounded-lg border px-3 py-2 text-sm"
                        placeholder="Description"
                      />
                    </div>
                    <label className="flex items-center gap-1 cursor-pointer mt-6">
                      <input
                        type="checkbox"
                        checked={param.required}
                        onChange={(e) => {
                          const params = [...(formData.parameters || [])];
                          params[index] = { ...params[index], required: e.target.checked };
                          setFormData({ ...formData, parameters: params });
                        }}
                        className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                      />
                      <span className="text-xs">Required</span>
                    </label>
                    <button onClick={() => removeParameter(index)} className="text-red-500 hover:text-red-700 p-1 mt-6">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>

              {/* Triggers */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium">Triggers</h4>
                  <button onClick={addTrigger} className="inline-flex items-center gap-1 text-xs px-2 py-1 border rounded hover:bg-accent">
                    <Plus className="h-3 w-3" /> Add
                  </button>
                </div>
                {formData.triggers?.map((trigger, index) => (
                  <div key={index} className="flex items-start gap-2 p-3 rounded-lg border bg-muted/30">
                    <select
                      value={trigger.type}
                      onChange={(e) => {
                        const triggers = [...(formData.triggers || [])];
                        triggers[index] = { ...triggers[index], type: e.target.value as "auto" | "manual" | "data_layer" | "gtm" };
                        setFormData({ ...formData, triggers });
                      }}
                      className="w-32 rounded-lg border px-3 py-2 text-sm"
                    >
                      <option value="auto">Auto (Wall-V)</option>
                      <option value="manual">Manual (code)</option>
                      <option value="data_layer">Data Layer</option>
                      <option value="gtm">GTM</option>
                    </select>
                    {trigger.type !== "auto" && (
                      <input
                        type="text"
                        value={trigger.selector || ""}
                        onChange={(e) => {
                          const triggers = [...(formData.triggers || [])];
                          triggers[index] = { ...triggers[index], selector: e.target.value };
                          setFormData({ ...formData, triggers });
                        }}
                        className="flex-1 rounded-lg border px-3 py-2 text-sm"
                        placeholder={trigger.type === "gtm" ? "GTM Trigger ID" : "CSS Selector"}
                      />
                    )}
                    {trigger.type === "data_layer" && (
                      <input
                        type="text"
                        value={trigger.event || ""}
                        onChange={(e) => {
                          const triggers = [...(formData.triggers || [])];
                          triggers[index] = { ...triggers[index], event: e.target.value };
                          setFormData({ ...formData, triggers });
                        }}
                        className="w-48 rounded-lg border px-3 py-2 text-sm"
                        placeholder="DL Event Name"
                      />
                    )}
                    <button onClick={() => removeTrigger(index)} className="text-red-500 hover:text-red-700 p-1">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-3 pt-4 border-t">
                <button onClick={handleCloseModal} className="px-4 py-2 border rounded-lg hover:bg-accent">
                  Cancel
                </button>
                <button onClick={handleSave} disabled={saving} className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg disabled:opacity-50">
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  {saving ? "Saving..." : editingEvent ? "Update Event" : "Create Event"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}