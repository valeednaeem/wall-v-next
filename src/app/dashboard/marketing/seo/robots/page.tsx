"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { Save, Loader2, CheckCircle2, AlertCircle, FileText, RefreshCw, Globe, ExternalLink, Settings, Shield, Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";

interface RobotsSettings {
  defaultDirectives: Array<{
    userAgent: string;
    allow: string[];
    disallow: string[];
  }>;
  additionalAllowed: string[];
  additionalBlocked: string[];
  sitemapUrl: string;
  hostDirective?: string;
  crawlDelay?: number;
}

export default function RobotsPage() {
  const { data: session, status } = useSession();
  const [settings, setSettings] = useState<RobotsSettings>({
    defaultDirectives: [
      { userAgent: "*", allow: ["/"], disallow: ["/dashboard", "/api", "/portal", "/customer", "/admin", "/orders", "/projects", "/private", "/preview", "/login", "/register", "/password-reset"] },
    ],
    additionalAllowed: [],
    additionalBlocked: [],
    sitemapUrl: "",
    hostDirective: "",
    crawlDelay: undefined,
  });
  const [effectiveRobots, setEffectiveRobots] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [saveMessage, setSaveMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    if (status === "loading") return;
    if (status === "unauthenticated") {
      window.location.href = "/login?callbackUrl=/dashboard/marketing/seo/robots";
      return;
    }
    fetchSettings();
    fetchEffectiveRobots();
  }, [status]);

  const fetchSettings = async () => {
    try {
      const res = await fetch("/api/marketing/seo/robots");
      const data = await res.json();
      if (data.success) {
        setSettings((prev) => ({ ...prev, ...data.data }));
      }
    } catch (error) {
      console.error("Failed to fetch settings:", error);
    }
  };

  const fetchEffectiveRobots = async () => {
    try {
      const res = await fetch("/api/marketing/seo/robots/effective");
      const data = await res.json();
      if (data.success) {
        setEffectiveRobots(data.data);
      }
    } catch (error) {
      console.error("Failed to fetch effective robots:", error);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/marketing/seo/robots", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      if (res.status === 401) { window.location.href = "/login?callbackUrl=/dashboard/marketing/seo/robots"; return; }
      const data = await res.json();
      if (res.ok && data.success) {
        setSaveMessage({ type: "success", text: "Robots.txt settings saved successfully" });
        fetchEffectiveRobots();
      } else {
        setSaveMessage({ type: "error", text: data.error || "Failed to save settings" });
      }
    } catch {
      setSaveMessage({ type: "error", text: "Network error" });
    } finally {
      setSaving(false);
    }
  };

  const handleRegenerate = async () => {
    setGenerating(true);
    try {
      const res = await fetch("/api/marketing/seo/robots/regenerate", { method: "POST" });
      const data = await res.json();
      if (data.success) {
        setSaveMessage({ type: "success", text: "Robots.txt regenerated" });
        fetchEffectiveRobots();
      } else {
        setSaveMessage({ type: "error", text: data.error || "Regeneration failed" });
      }
    } catch {
      setSaveMessage({ type: "error", text: "Network error" });
    } finally {
      setGenerating(false);
    }
  };

  const addDirective = () => {
    setSettings((prev) => ({
      ...prev,
      defaultDirectives: [...prev.defaultDirectives, { userAgent: "", allow: [], disallow: [] }],
    }));
  };

  const removeDirective = (index: number) => {
    setSettings((prev) => ({
      ...prev,
      defaultDirectives: prev.defaultDirectives.filter((_, i) => i !== index),
    }));
  };

  const addAllowed = () => {
    setSettings((prev) => ({ ...prev, additionalAllowed: [...prev.additionalAllowed, ""] }));
  };

  const removeAllowed = (index: number) => {
    setSettings((prev) => ({ ...prev, additionalAllowed: prev.additionalAllowed.filter((_, i) => i !== index) }));
  };

  const addBlocked = () => {
    setSettings((prev) => ({ ...prev, additionalBlocked: [...prev.additionalBlocked, ""] }));
  };

  const removeBlocked = (index: number) => {
    setSettings((prev) => ({ ...prev, additionalBlocked: prev.additionalBlocked.filter((_, i) => i !== index) }));
  };

  if (status === "loading") {
    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold">Robots.txt Management</h2>
        <div className="rounded-lg border p-6 animate-pulse space-y-4">
          <div className="h-4 bg-muted rounded w-1/4" />
          <div className="h-4 bg-muted rounded w-1/2" />
        </div>
      </div>
    );
  }

  if (!session) return null;

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://wall-v.com";
  const robotsUrl = `${baseUrl}/robots.txt`;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <FileText className="h-6 w-6 text-primary" />
            Robots.txt Management
          </h2>
          <p className="text-sm text-muted-foreground mt-1">Configure robots.txt directives — private routes are always protected regardless of settings</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={handleRegenerate} disabled={generating} className="inline-flex items-center gap-2 border rounded-lg px-3 py-2 hover:bg-accent transition-colors disabled:opacity-50">
            {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            Regenerate
          </button>
          <a href={robotsUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-sm border rounded-lg px-3 py-2 hover:bg-accent transition-colors">
            <ExternalLink className="h-4 w-4" />
            View Live
          </a>
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

      {/* Protected Routes Notice */}
      <div className="rounded-lg border p-4 bg-amber-50 border-amber-200">
        <div className="flex items-start gap-3">
          <Shield className="h-5 w-5 text-amber-600 mt-0.5" />
          <div>
            <h3 className="font-medium text-amber-900">System-Protected Routes</h3>
            <p className="text-sm text-amber-800 mt-1">
              The following routes are <strong>always blocked</strong> in robots.txt regardless of your configuration below:
              <code className="bg-amber-100 px-1 rounded">/dashboard</code>, <code className="bg-amber-100 px-1 rounded">/api</code>, <code className="bg-amber-100 px-1 rounded">/customer</code>, <code className="bg-amber-100 px-1 rounded">/admin</code>, <code className="bg-amber-100 px-1 rounded">/orders</code>, <code className="bg-amber-100 px-1 rounded">/projects</code>, <code className="bg-amber-100 px-1 rounded">/private</code>, <code className="bg-amber-100 px-1 rounded">/preview</code>, <code className="bg-amber-100 px-1 rounded">/login</code>, <code className="bg-amber-100 px-1 rounded">/register</code>, <code className="bg-amber-100 px-1 rounded">/password-reset</code>
            </p>
            <p className="text-xs text-amber-700 mt-2">This prevents accidental exposure of private dashboard and customer resources.</p>
          </div>
        </div>
      </div>

      {/* Default Directives */}
      <div className="rounded-lg border p-6 space-y-6">
        <h3 className="font-semibold flex items-center gap-2">
          <Settings className="h-5 w-5" />
          Default Directives
        </h3>
        {settings.defaultDirectives.map((directive, index) => (
          <div key={index} className="rounded-lg border p-4 space-y-4 bg-muted/30">
            <div className="flex items-center justify-between">
              <h4 className="font-medium">User Agent #{index + 1}</h4>
              {settings.defaultDirectives.length > 1 && (
                <button onClick={() => removeDirective(index)} className="text-red-500 hover:text-red-700 p-1">
                  <AlertCircle className="h-4 w-4" />
                </button>
              )}
            </div>
            <div className="grid md:grid-cols-3 gap-4">
              <div>
                <label className="text-sm font-medium">User Agent</label>
                <input
                  type="text"
                  value={directive.userAgent}
                  onChange={(e) => {
                    const updated = [...settings.defaultDirectives];
                    updated[index] = { ...updated[index], userAgent: e.target.value };
                    setSettings({ ...settings, defaultDirectives: updated });
                  }}
                  className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
                  placeholder="*"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Allow (one per line)</label>
                <textarea
                  value={directive.allow.join("\n")}
                  onChange={(e) => {
                    const updated = [...settings.defaultDirectives];
                    updated[index] = { ...updated[index], allow: e.target.value.split("\n").filter(Boolean) };
                    setSettings({ ...settings, defaultDirectives: updated });
                  }}
                  className="mt-1 w-full rounded-lg border px-3 py-2 text-sm font-mono"
                  rows={3}
                  placeholder="/\n/public"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Disallow (one per line)</label>
                <textarea
                  value={directive.disallow.join("\n")}
                  onChange={(e) => {
                    const updated = [...settings.defaultDirectives];
                    updated[index] = { ...updated[index], disallow: e.target.value.split("\n").filter(Boolean) };
                    setSettings({ ...settings, defaultDirectives: updated });
                  }}
                  className="mt-1 w-full rounded-lg border px-3 py-2 text-sm font-mono"
                  rows={3}
                  placeholder="/dashboard\n/api"
                />
              </div>
            </div>
          </div>
        ))}
        {settings.defaultDirectives.length < 5 && (
          <button onClick={addDirective} className="inline-flex items-center gap-2 text-sm border rounded-lg px-3 py-2 hover:bg-accent transition-colors">
            <CheckCircle2 className="h-4 w-4" />
            Add Directive
          </button>
        )}
      </div>

      {/* Additional Allowed Paths */}
      <div className="rounded-lg border p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-green-500" />
            Additional Allowed Paths
          </h3>
          <button onClick={addAllowed} className="inline-flex items-center gap-2 text-sm border rounded-lg px-3 py-2 hover:bg-accent transition-colors">
            <CheckCircle2 className="h-4 w-4" />
            Add Path
          </button>
        </div>
        <p className="text-xs text-muted-foreground">Paths to explicitly allow (added to all user agents)</p>
        <div className="space-y-2">
          {settings.additionalAllowed.map((path, index) => (
            <div key={index} className="flex items-center gap-2">
              <input
                type="text"
                value={path}
                onChange={(e) => {
                  const updated = [...settings.additionalAllowed];
                  updated[index] = e.target.value;
                  setSettings({ ...settings, additionalAllowed: updated });
                }}
                className="flex-1 rounded-lg border px-3 py-2 text-sm font-mono"
                placeholder="/public-folder/"
              />
              <button onClick={() => removeAllowed(index)} className="text-red-500 hover:text-red-700 p-1">
                <AlertCircle className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Additional Blocked Paths */}
      <div className="rounded-lg border p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-red-500" />
            Additional Blocked Paths
          </h3>
          <button onClick={addBlocked} className="inline-flex items-center gap-2 text-sm border rounded-lg px-3 py-2 hover:bg-accent transition-colors">
            <CheckCircle2 className="h-4 w-4" />
            Add Path
          </button>
        </div>
        <p className="text-xs text-muted-foreground">Paths to explicitly block (added to all user agents)</p>
        <div className="space-y-2">
          {settings.additionalBlocked.map((path, index) => (
            <div key={index} className="flex items-center gap-2">
              <input
                type="text"
                value={path}
                onChange={(e) => {
                  const updated = [...settings.additionalBlocked];
                  updated[index] = e.target.value;
                  setSettings({ ...settings, additionalBlocked: updated });
                }}
                className="flex-1 rounded-lg border px-3 py-2 text-sm font-mono"
                placeholder="/temp-folder/"
              />
              <button onClick={() => removeBlocked(index)} className="text-red-500 hover:text-red-700 p-1">
                <AlertCircle className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Sitemap & Advanced */}
      <div className="rounded-lg border p-6 space-y-6">
        <h3 className="font-semibold flex items-center gap-2">
          <Globe className="h-5 w-5" />
          Sitemap & Advanced
        </h3>
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium">Sitemap URL</label>
            <input
              type="url"
              value={settings.sitemapUrl}
              onChange={(e) => setSettings({ ...settings, sitemapUrl: e.target.value })}
              className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
              placeholder="https://wall-v.com/sitemap.xml"
            />
          </div>
          <div>
            <label className="text-sm font-medium">Host Directive</label>
            <input
              type="text"
              value={settings.hostDirective || ""}
              onChange={(e) => setSettings({ ...settings, hostDirective: e.target.value })}
              className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
              placeholder="wall-v.com"
            />
            <p className="text-xs text-muted-foreground mt-1">Preferred domain (optional)</p>
          </div>
          <div>
            <label className="text-sm font-medium">Crawl Delay (seconds)</label>
            <input
              type="number"
              step="0.1"
              value={settings.crawlDelay || ""}
              onChange={(e) => setSettings({ ...settings, crawlDelay: e.target.value ? parseFloat(e.target.value) : undefined })}
              className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
              placeholder="10"
            />
            <p className="text-xs text-muted-foreground mt-1">Delay between requests (optional, not all bots respect this)</p>
          </div>
        </div>
      </div>

      {/* Effective Robots.txt Preview */}
      <div className="rounded-lg border p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold flex items-center gap-2">
            <Eye className="h-5 w-5" />
            Effective Robots.txt Preview
          </h3>
          <a href={robotsUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline">
            View live at {robotsUrl}
          </a>
        </div>
        <pre className="bg-gray-100 p-4 rounded border overflow-x-auto text-sm text-gray-800 max-h-96 font-mono">
{effectiveRobots || "# Loading..."}
        </pre>
      </div>
    </div>
  );
}