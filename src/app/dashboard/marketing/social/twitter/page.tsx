"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { Save, Loader2, Eye, EyeOff, Globe, Share2, Image, CheckCircle2, AlertCircle, RefreshCw, ExternalLink, MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";

interface TwitterSettings {
  defaultCard: "summary" | "summary_large_image" | "app" | "player";
  defaultTitle: string;
  defaultDescription: string;
  defaultImage: string;
  siteHandle: string;
  creatorHandle: string;
  pageOverrides: Record<string, {
    card?: string;
    title?: string;
    description?: string;
    image?: string;
  }>;
}

interface TwitterPreviewData {
  url: string;
  card: string;
  title: string;
  description: string;
  image: string;
  siteHandle: string;
  creatorHandle: string;
}

export default function TwitterSettingsPage() {
  const { data: session, status } = useSession();
  const [settings, setSettings] = useState<TwitterSettings>({
    defaultCard: "summary_large_image",
    defaultTitle: "Wall-V | AI-Powered Digital Agency",
    defaultDescription: "Transform your business with AI-powered web development, mobile apps, ERP/CRM solutions, and cloud hosting.",
    defaultImage: "",
    siteHandle: "@wallv",
    creatorHandle: "@wallv",
    pageOverrides: {},
  });
  const [previewData, setPreviewData] = useState<TwitterPreviewData | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [previewUrl, setPreviewUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const [generatingPreview, setGeneratingPreview] = useState(false);
  const [saveMessage, setSaveMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (status === "loading") return;
    if (status === "unauthenticated") {
      window.location.href = "/login?callbackUrl=/dashboard/marketing/social/twitter";
      return;
    }
    fetchSettings();
  }, [status]);

  const fetchSettings = async () => {
    try {
      const res = await fetch("/api/marketing/social/twitter");
      const data = await res.json();
      if (data.success) {
        setSettings((prev) => ({ ...prev, ...data.data }));
      }
    } catch (error) {
      console.error("Failed to fetch settings:", error);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setSaveMessage(null);
    try {
      const res = await fetch("/api/marketing/social/twitter", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      if (res.status === 401) { window.location.href = "/login?callbackUrl=/dashboard/marketing/social/twitter"; return; }
      const data = await res.json();
      if (res.ok && data.success) {
        setSaveMessage({ type: "success", text: "Twitter Card settings saved successfully" });
      } else {
        setSaveMessage({ type: "error", text: data.error || "Failed to save settings" });
      }
    } catch {
      setSaveMessage({ type: "error", text: "Network error" });
    } finally {
      setSaving(false);
    }
  };

  const handleGeneratePreview = async () => {
    setGeneratingPreview(true);
    try {
      const res = await fetch("/api/marketing/social/twitter/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: previewUrl || "/" }),
      });
      const data = await res.json();
      if (data.success) {
        setPreviewData(data.data);
        setShowPreview(true);
      } else {
        setSaveMessage({ type: "error", text: data.error || "Failed to generate preview" });
      }
    } catch {
      setSaveMessage({ type: "error", text: "Network error" });
    } finally {
      setGeneratingPreview(false);
    }
  };

  if (status === "loading") {
    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold">Twitter Card Settings</h2>
        <div className="rounded-lg border p-6 animate-pulse space-y-4">
          <div className="h-4 bg-muted rounded w-1/4" />
          <div className="h-4 bg-muted rounded w-1/2" />
        </div>
      </div>
    );
  }

  if (!session) return null;

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://wall-v.com";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <MessageSquare className="h-6 w-6 text-sky-500" />
            Twitter / X Card Settings
          </h2>
          <p className="text-sm text-muted-foreground mt-1">Configure how your pages appear when shared on Twitter/X</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={handleGeneratePreview} disabled={generatingPreview} className="inline-flex items-center gap-2 border rounded-lg px-3 py-2 hover:bg-accent transition-colors disabled:opacity-50">
            {generatingPreview ? <Loader2 className="h-4 w-4 animate-spin" /> : <Eye className="h-4 w-4" />}
            Preview
          </button>
          <button onClick={handleSave} disabled={saving} className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>

      {saveMessage && (
        <div className={`p-3 rounded-lg text-sm ${saveMessage.type === "success" ? "bg-green-50 text-green-700 border border-green-200" : "bg-red-50 text-red-700 border border-red-200"}`}>
          {saveMessage.text}
        </div>
      )}

      {/* Settings Form */}
      <div className="rounded-lg border p-6 space-y-6">
        <h3 className="font-semibold flex items-center gap-2">
          <Share2 className="h-5 w-5" />
          Default Twitter Card Tags
        </h3>

        <div className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">Default Card Type</label>
              <select
                value={settings.defaultCard}
                onChange={(e) => setSettings({ ...settings, defaultCard: e.target.value as TwitterSettings["defaultCard"] })}
                className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
              >
                <option value="summary_large_image">Summary Large Image (Recommended)</option>
                <option value="summary">Summary</option>
                <option value="app">App</option>
                <option value="player">Player</option>
              </select>
              <p className="text-xs text-muted-foreground mt-1">Large image cards drive more engagement</p>
            </div>
            <div>
              <label className="text-sm font-medium">Site @Handle</label>
              <input
                type="text"
                value={settings.siteHandle}
                onChange={(e) => setSettings({ ...settings, siteHandle: e.target.value })}
                className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
                placeholder="@wallv"
              />
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">Creator @Handle</label>
              <input
                type="text"
                value={settings.creatorHandle}
                onChange={(e) => setSettings({ ...settings, creatorHandle: e.target.value })}
                className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
                placeholder="@wallv"
              />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium">Default Title</label>
            <input
              type="text"
              value={settings.defaultTitle}
              onChange={(e) => setSettings({ ...settings, defaultTitle: e.target.value })}
              className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
            />
            <p className="text-xs text-muted-foreground mt-1">{settings.defaultTitle.length}/70 characters</p>
          </div>

          <div>
            <label className="text-sm font-medium">Default Description</label>
            <textarea
              value={settings.defaultDescription}
              onChange={(e) => setSettings({ ...settings, defaultDescription: e.target.value })}
              className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
              rows={3}
            />
            <p className="text-xs text-muted-foreground mt-1">{settings.defaultDescription.length}/200 characters</p>
          </div>

          <div>
            <label className="text-sm font-medium">Default Image URL</label>
            <input
              type="url"
              value={settings.defaultImage}
              onChange={(e) => setSettings({ ...settings, defaultImage: e.target.value })}
              className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
              placeholder="https://wall-v.com/twitter-default.png"
            />
            <p className="text-xs text-muted-foreground mt-1">1200x675px recommended for large image cards (16:9 ratio)</p>
          </div>
        </div>

        {/* Page-Specific Overrides */}
        <div className="pt-6 border-t space-y-4">
          <h4 className="font-medium flex items-center gap-2">
            <Image className="h-5 w-5" />
            Page-Specific Overrides
          </h4>
          <p className="text-sm text-muted-foreground">Override Twitter tags for specific pages. Path should be relative (e.g., /products/my-product)</p>
          <div className="space-y-3">
            {Object.entries(settings.pageOverrides).map(([path, override]) => (
              <div key={path} className="p-3 rounded-lg border bg-muted/30">
                <div className="flex items-center gap-2 mb-2">
                  <span className="font-mono text-sm">{path}</span>
                  <button
                    onClick={() => {
                      const newOverrides = { ...settings.pageOverrides };
                      delete newOverrides[path];
                      setSettings({ ...settings, pageOverrides: newOverrides });
                    }}
                    className="ml-auto text-red-500 hover:text-red-700 p-1"
                  >
                    <AlertCircle className="h-4 w-4" />
                  </button>
                </div>
                <div className="grid md:grid-cols-4 gap-3">
                  <select
                    value={override.card || settings.defaultCard}
                    onChange={(e) => {
                      const newOverrides = { ...settings.pageOverrides };
                      newOverrides[path] = { ...newOverrides[path], card: e.target.value };
                      setSettings({ ...settings, pageOverrides: newOverrides });
                    }}
                    className="rounded-lg border px-3 py-2 text-sm"
                  >
                    <option value="summary_large_image">Summary Large Image</option>
                    <option value="summary">Summary</option>
                    <option value="app">App</option>
                    <option value="player">Player</option>
                  </select>
                  <input
                    type="text"
                    value={override.title || ""}
                    onChange={(e) => {
                      const newOverrides = { ...settings.pageOverrides };
                      newOverrides[path] = { ...newOverrides[path], title: e.target.value };
                      setSettings({ ...settings, pageOverrides: newOverrides });
                    }}
                    className="rounded-lg border px-3 py-2 text-sm"
                    placeholder="Custom title"
                  />
                  <input
                    type="text"
                    value={override.description || ""}
                    onChange={(e) => {
                      const newOverrides = { ...settings.pageOverrides };
                      newOverrides[path] = { ...newOverrides[path], description: e.target.value };
                      setSettings({ ...settings, pageOverrides: newOverrides });
                    }}
                    className="rounded-lg border px-3 py-2 text-sm"
                    placeholder="Custom description"
                  />
                  <input
                    type="url"
                    value={override.image || ""}
                    onChange={(e) => {
                      const newOverrides = { ...settings.pageOverrides };
                      newOverrides[path] = { ...newOverrides[path], image: e.target.value };
                      setSettings({ ...settings, pageOverrides: newOverrides });
                    }}
                    className="rounded-lg border px-3 py-2 text-sm"
                    placeholder="Custom image URL"
                  />
                </div>
              </div>
            ))}
            <button
              onClick={() => {
                const path = prompt("Enter page path (e.g., /products/my-product):");
                if (path) {
                  setSettings((prev) => ({
                    ...prev,
                    pageOverrides: { ...prev.pageOverrides, [path]: {} },
                  }));
                }
              }}
              className="inline-flex items-center gap-2 text-sm border rounded-lg px-3 py-2 hover:bg-accent transition-colors"
            >
              <Plus className="h-4 w-4" />
              Add Override
            </button>
          </div>
        </div>
      </div>

      {/* Preview */}
      {showPreview && previewData && (
        <div className="rounded-lg border p-6 space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold flex items-center gap-2">
              <Eye className="h-5 w-5" />
              Twitter Card Preview for: {previewData.url}
            </h3>
            <button onClick={() => setShowPreview(false)} className="text-muted-foreground hover:text-foreground">
              <AlertCircle className="h-5 w-5" />
            </button>
          </div>

          <div className="rounded-lg border p-4 bg-white max-w-md">
            <div className="flex items-center gap-2 text-sm text-gray-500 mb-3">
              <span>@{previewData.siteHandle.replace("@", "")}</span>
              <span>·</span>
              <span className="capitalize">{previewData.card.replace("_", " ")}</span>
            </div>
            {previewData.image && (
              <img src={previewData.image} alt="Twitter Preview" className="w-full h-48 object-cover rounded mb-3" />
            )}
            <div className="p-2">
              <div className="font-semibold text-gray-900">{previewData.title}</div>
              <div className="text-sm text-gray-600 mt-1">{previewData.description}</div>
            </div>
          </div>

          {/* Raw Tags */}
          <div className="rounded-lg border p-4 bg-gray-100">
            <h4 className="font-medium mb-2">Generated Meta Tags</h4>
            <pre className="text-xs text-gray-800 overflow-x-auto">
{`<meta name="twitter:card" content="${previewData.card}" />
<meta name="twitter:site" content="${previewData.siteHandle}" />
<meta name="twitter:creator" content="${previewData.creatorHandle}" />
<meta name="twitter:title" content="${previewData.title}" />
<meta name="twitter:description" content="${previewData.description}" />
<meta name="twitter:image" content="${previewData.image}" />
<meta name="twitter:image:alt" content="${previewData.title}" />`}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}