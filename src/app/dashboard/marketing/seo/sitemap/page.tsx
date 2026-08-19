"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { Save, Loader2, CheckCircle2, AlertCircle, FileText, RefreshCw, Globe, ExternalLink, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

interface SitemapSettings {
  includePages: boolean;
  includePosts: boolean;
  includeProducts: boolean;
  includeServices: boolean;
  includeCategories: boolean;
  includeTags: boolean;
  includeLegal: boolean;
  includePortfolio: boolean;
  maxUrlsPerPage: number;
  defaultPriority: number;
  defaultChangeFreq: string;
  customUrls: Array<{
    url: string;
    priority: number;
    changeFreq: string;
    lastMod?: string;
    isActive: boolean;
  }>;
  excludePatterns: string[];
  lastGenerated?: string;
}

interface SitemapStats {
  totalUrls: number;
  pagesCount: number;
  postsCount: number;
  productsCount: number;
  servicesCount: number;
  categoriesCount: number;
  tagsCount: number;
  legalCount: number;
  portfolioCount: number;
  customCount: number;
}

export default function SitemapPage() {
  const { data: session, status } = useSession();
  const [settings, setSettings] = useState<SitemapSettings>({
    includePages: true,
    includePosts: true,
    includeProducts: true,
    includeServices: true,
    includeCategories: true,
    includeTags: true,
    includeLegal: true,
    includePortfolio: true,
    maxUrlsPerPage: 50000,
    defaultPriority: 0.5,
    defaultChangeFreq: "weekly",
    customUrls: [],
    excludePatterns: [],
  });
  const [stats, setStats] = useState<SitemapStats | null>(null);
  const [generating, setGenerating] = useState(false);
  const [validating, setValidating] = useState(false);
  const [saveMessage, setSaveMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [activeTab, setActiveTab] = useState<"settings" | "preview" | "stats">("settings");
  const [newCustomUrl, setNewCustomUrl] = useState("");
  const [newExcludePattern, setNewExcludePattern] = useState("");

  useEffect(() => {
    if (status === "loading") return;
    if (status === "unauthenticated") {
      window.location.href = "/login?callbackUrl=/dashboard/marketing/seo/sitemap";
      return;
    }
    fetchSettings();
    fetchStats();
  }, [status]);

  const fetchSettings = async () => {
    try {
      const res = await fetch("/api/marketing/seo/sitemap");
      const data = await res.json();
      if (data.success) {
        setSettings((prev) => ({ ...prev, ...data.data }));
      }
    } catch (error) {
      console.error("Failed to fetch settings:", error);
    }
  };

  const fetchStats = async () => {
    try {
      const res = await fetch("/api/marketing/seo/sitemap/stats");
      const data = await res.json();
      if (data.success) {
        setStats(data.data);
      }
    } catch (error) {
      console.error("Failed to fetch stats:", error);
    }
  };

  const handleSave = async () => {
    try {
      const res = await fetch("/api/marketing/seo/sitemap", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      if (res.status === 401) { window.location.href = "/login?callbackUrl=/dashboard/marketing/seo/sitemap"; return; }
      const data = await res.json();
      if (res.ok && data.success) {
        setSaveMessage({ type: "success", text: "Sitemap settings saved successfully" });
        fetchStats();
      } else {
        setSaveMessage({ type: "error", text: data.error || "Failed to save settings" });
      }
    } catch {
      setSaveMessage({ type: "error", text: "Network error" });
    }
  };

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const res = await fetch("/api/marketing/seo/sitemap/generate", { method: "POST" });
      const data = await res.json();
      if (data.success) {
        setSaveMessage({ type: "success", text: `Sitemap generated: ${data.data.urlCount} URLs` });
        fetchSettings();
        fetchStats();
      } else {
        setSaveMessage({ type: "error", text: data.error || "Generation failed" });
      }
    } catch {
      setSaveMessage({ type: "error", text: "Network error" });
    } finally {
      setGenerating(false);
    }
  };

  const handleValidate = async () => {
    setValidating(true);
    try {
      const res = await fetch("/api/marketing/seo/sitemap/validate", { method: "POST" });
      const data = await res.json();
      if (data.success) {
        setSaveMessage({ type: "success", text: `Sitemap valid: ${data.data.message}` });
      } else {
        setSaveMessage({ type: "error", text: data.error || "Validation failed" });
      }
    } catch {
      setSaveMessage({ type: "error", text: "Network error" });
    } finally {
      setValidating(false);
    }
  };

  const addCustomUrl = () => {
    if (newCustomUrl.trim()) {
      setSettings((prev) => ({
        ...prev,
        customUrls: [
          ...prev.customUrls,
          { url: newCustomUrl.trim(), priority: 0.5, changeFreq: "monthly", isActive: true },
        ],
      }));
      setNewCustomUrl("");
    }
  };

  const removeCustomUrl = (index: number) => {
    setSettings((prev) => ({
      ...prev,
      customUrls: prev.customUrls.filter((_, i) => i !== index),
    }));
  };

  const toggleCustomUrl = (index: number) => {
    setSettings((prev) => ({
      ...prev,
      customUrls: prev.customUrls.map((u, i) => (i === index ? { ...u, isActive: !u.isActive } : u)),
    }));
  };

  const addExcludePattern = () => {
    if (newExcludePattern.trim()) {
      setSettings((prev) => ({
        ...prev,
        excludePatterns: [...prev.excludePatterns, newExcludePattern.trim()],
      }));
      setNewExcludePattern("");
    }
  };

  const removeExcludePattern = (index: number) => {
    setSettings((prev) => ({
      ...prev,
      excludePatterns: prev.excludePatterns.filter((_, i) => i !== index),
    }));
  };

  if (status === "loading") {
    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold">Sitemap Management</h2>
        <div className="rounded-lg border p-6 animate-pulse space-y-4">
          <div className="h-4 bg-muted rounded w-1/4" />
          <div className="h-4 bg-muted rounded w-1/2" />
        </div>
      </div>
    );
  }

  if (!session) return null;

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://wall-v.com";
  const sitemapUrl = `${baseUrl}/sitemap.xml`;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <FileText className="h-6 w-6 text-primary" />
            Sitemap Management
          </h2>
          <p className="text-sm text-muted-foreground mt-1">Configure XML sitemap generation, inclusions, and custom URLs</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={handleGenerate} disabled={generating} className="inline-flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50">
            {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
            {generating ? "Generating..." : "Generate Now"}
          </button>
          <button onClick={handleValidate} disabled={validating} className="inline-flex items-center gap-2 border rounded-lg px-3 py-2 hover:bg-accent transition-colors disabled:opacity-50">
            {validating ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
            Validate
          </button>
          <a href={sitemapUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-sm border rounded-lg px-3 py-2 hover:bg-accent transition-colors">
            <ExternalLink className="h-4 w-4" />
            View Sitemap
          </a>
        </div>
      </div>

      {saveMessage && (
        <div className={`p-3 rounded-lg text-sm ${saveMessage.type === "success" ? "bg-green-50 text-green-700 border border-green-200" : "bg-red-50 text-red-700 border border-red-200"}`}>
          {saveMessage.text}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 border-b">
        {[
          { id: "settings", label: "Settings", icon: Settings },
          { id: "stats", label: "Statistics", icon: FileText },
          { id: "preview", label: "Preview", icon: Globe },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as typeof activeTab)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.id
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <tab.icon className="h-4 w-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Settings Tab */}
      {activeTab === "settings" && (
        <div className="space-y-6">
          {/* Content Inclusions */}
          <div className="rounded-lg border p-6 space-y-6">
            <h3 className="font-semibold flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Content to Include
            </h3>
            <div className="grid md:grid-cols-2 gap-4">
              {[
                { key: "includePages", label: "Pages", description: "Static pages from CMS" },
                { key: "includePosts", label: "Blog Posts", description: "Published blog posts" },
                { key: "includeProducts", label: "Products", description: "Published products & services" },
                { key: "includeServices", label: "Services", description: "Service pages" },
                { key: "includeCategories", label: "Categories", description: "Product & blog categories" },
                { key: "includeTags", label: "Tags", description: "Blog tags" },
                { key: "includeLegal", label: "Legal Pages", description: "Privacy, terms, cookies" },
                { key: "includePortfolio", label: "Portfolio", description: "Case studies & projects" },
              ].map((item) => (
                <label key={item.key} className="flex items-center gap-3 p-3 rounded-lg border hover:bg-accent/50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings[item.key as keyof SitemapSettings] as boolean}
                    onChange={(e) => setSettings({ ...settings, [item.key]: e.target.checked })}
                    className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                  />
                  <div>
                    <div className="font-medium">{item.label}</div>
                    <div className="text-xs text-muted-foreground">{item.description}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Sitemap Parameters */}
          <div className="rounded-lg border p-6 space-y-6">
            <h3 className="font-semibold flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Sitemap Parameters
            </h3>
            <div className="grid md:grid-cols-3 gap-4">
              <div>
                <label className="text-sm font-medium">Max URLs per Sitemap</label>
                <input
                  type="number"
                  value={settings.maxUrlsPerPage}
                  onChange={(e) => setSettings({ ...settings, maxUrlsPerPage: parseInt(e.target.value) })}
                  className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
                  min="1000"
                  max="50000"
                />
                <p className="text-xs text-muted-foreground mt-1">Google limit: 50,000</p>
              </div>
              <div>
                <label className="text-sm font-medium">Default Priority</label>
                <input
                  type="number"
                  step="0.1"
                  value={settings.defaultPriority}
                  onChange={(e) => setSettings({ ...settings, defaultPriority: parseFloat(e.target.value) })}
                  className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
                  min="0"
                  max="1"
                />
                <p className="text-xs text-muted-foreground mt-1">0.0 to 1.0</p>
              </div>
              <div>
                <label className="text-sm font-medium">Default Change Frequency</label>
                <select
                  value={settings.defaultChangeFreq}
                  onChange={(e) => setSettings({ ...settings, defaultChangeFreq: e.target.value })}
                  className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
                >
                  <option value="always">Always</option>
                  <option value="hourly">Hourly</option>
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                  <option value="yearly">Yearly</option>
                  <option value="never">Never</option>
                </select>
              </div>
            </div>
          </div>

          {/* Custom URLs */}
          <div className="rounded-lg border p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">Custom URLs</h3>
              <div className="flex gap-2">
                <input
                  type="url"
                  value={newCustomUrl}
                  onChange={(e) => setNewCustomUrl(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addCustomUrl()}
                  placeholder="https://example.com/custom-page"
                  className="rounded-lg border px-3 py-2 text-sm w-64"
                />
                <button onClick={addCustomUrl} disabled={!newCustomUrl.trim()} className="px-3 py-2 bg-primary text-primary-foreground rounded-lg text-sm disabled:opacity-50">
                  Add
                </button>
              </div>
            </div>
            {settings.customUrls.length > 0 && (
              <div className="space-y-2">
                {settings.customUrls.map((url, index) => (
                  <div key={index} className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                    <input
                      type="checkbox"
                      checked={url.isActive}
                      onChange={() => toggleCustomUrl(index)}
                      className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                    />
                    <div className="flex-1">
                      <div className="font-mono text-sm">{url.url}</div>
                      <div className="text-xs text-muted-foreground">
                        Priority: {url.priority} · ChangeFreq: {url.changeFreq}
                      </div>
                    </div>
                    <button onClick={() => removeCustomUrl(index)} className="text-red-500 hover:text-red-700">
                      <AlertCircle className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Exclude Patterns */}
          <div className="rounded-lg border p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">Exclude Patterns (glob)</h3>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newExcludePattern}
                  onChange={(e) => setNewExcludePattern(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addExcludePattern()}
                  placeholder="/admin/* /private/* /api/*"
                  className="rounded-lg border px-3 py-2 text-sm w-64"
                />
                <button onClick={addExcludePattern} disabled={!newExcludePattern.trim()} className="px-3 py-2 bg-primary text-primary-foreground rounded-lg text-sm disabled:opacity-50">
                  Add
                </button>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">Patterns to exclude from sitemap. Example: <code className="bg-gray-100 px-1 rounded">/dashboard/*</code>, <code className="bg-gray-100 px-1 rounded">/api/*</code>, <code className="bg-gray-100 px-1 rounded">/preview-*</code></p>
            {settings.excludePatterns.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {settings.excludePatterns.map((pattern, index) => (
                  <span key={index} className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-100 text-amber-700 rounded-full text-sm">
                    {pattern}
                    <button onClick={() => removeExcludePattern(index)} className="hover:text-red-500">
                      <AlertCircle className="h-3.5 w-3.5" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Save Button */}
          <div className="flex justify-end">
            <button onClick={handleSave} className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-primary/90">
              <Save className="h-4 w-4" />
              Save Sitemap Settings
            </button>
          </div>
        </div>
      )}

      {/* Stats Tab */}
      {activeTab === "stats" && stats && (
        <div className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
            {[
              { label: "Total URLs", value: stats.totalUrls, icon: FileText, color: "text-blue-500" },
              { label: "Pages", value: stats.pagesCount, icon: Globe, color: "text-green-500" },
              { label: "Posts", value: stats.postsCount, icon: FileText, color: "text-purple-500" },
              { label: "Products", value: stats.productsCount, icon: Settings, color: "text-orange-500" },
              { label: "Categories", value: stats.categoriesCount, icon: Settings, color: "text-pink-500" },
            ].map((stat) => (
              <div key={stat.label} className="rounded-lg border p-6">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                  <stat.icon className={cn("h-5 w-5", stat.color)} />
                </div>
                <p className="mt-2 text-3xl font-bold">{stat.value.toLocaleString()}</p>
              </div>
            ))}
          </div>

          <div className="rounded-lg border p-6">
            <h3 className="font-semibold mb-4">Inclusion Breakdown</h3>
            <div className="space-y-2">
              {[
                { label: "Blog Tags", value: stats.tagsCount },
                { label: "Services", value: stats.servicesCount },
                { label: "Legal Pages", value: stats.legalCount },
                { label: "Portfolio", value: stats.portfolioCount },
                { label: "Custom URLs", value: stats.customCount },
              ].map((item) => (
                <div key={item.label} className="flex justify-between text-sm py-2 border-b last:border-0">
                  <span className="text-muted-foreground">{item.label}</span>
                  <span className="font-medium">{item.value.toLocaleString()}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Preview Tab */}
      {activeTab === "preview" && (
        <div className="rounded-lg border p-6 bg-gray-50">
          <h3 className="font-semibold mb-4">Sitemap Preview</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Sitemap will be available at: <code className="bg-white px-2 rounded">{sitemapUrl}</code>
          </p>
          <pre className="bg-white p-4 rounded border overflow-x-auto text-xs text-gray-800 max-h-96">
{`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${baseUrl}/</loc>
    <changefreq>${settings.defaultChangeFreq}</changefreq>
    <priority>1.0</priority>
  </url>
  ${settings.includePages ? `  <url>
    <loc>${baseUrl}/about</loc>
    <changefreq>${settings.defaultChangeFreq}</changefreq>
    <priority>${settings.defaultPriority}</priority>
  </url>` : ""}
  ${settings.includeProducts ? `  <url>
    <loc>${baseUrl}/products/example-product</loc>
    <changefreq>${settings.defaultChangeFreq}</changefreq>
    <priority>${settings.defaultPriority}</priority>
  </url>` : ""}
  ${settings.customUrls.filter(u => u.isActive).map(u => `  <url>
    <loc>${u.url}</loc>
    <changefreq>${u.changeFreq}</changefreq>
    <priority>${u.priority}</priority>
  </url>`).join("\n")}
</urlset>`}
          </pre>
          {settings.lastGenerated && (
            <p className="text-sm text-muted-foreground mt-4">Last generated: {new Date(settings.lastGenerated).toLocaleString()}</p>
          )}
        </div>
      )}
    </div>
  );
}