"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { Save, Loader2, CheckCircle2, AlertCircle, ExternalLink, RefreshCw, Eye, EyeOff, Key, Globe, Search, FileText, Package, Share2, Database, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

interface GlobalSEOConfig {
  siteTitle: string;
  siteDescription: string;
  defaultKeywords: string;
  canonicalDomain: string;
  defaultOGImage: string;
  defaultTwitterImage: string;
  siteName: string;
  author: string;
  organizationName: string;
  organizationUrl: string;
  logo: string;
  defaultRobots: "index,follow" | "noindex,follow" | "index,nofollow" | "noindex,nofollow";
  twitterHandle: string;
  facebookAppId: string;
}

interface SEOHealthStats {
  totalPages: number;
  passed: number;
  warnings: number;
  critical: number;
  lastChecked?: string;
}

export default function GlobalSEOPage() {
  const { data: session, status } = useSession();
  const [config, setConfig] = useState<GlobalSEOConfig>({
    siteTitle: "Wall-V | AI-Powered Digital Agency",
    siteDescription: "Transform your business with AI-powered web development, mobile apps, ERP/CRM solutions, and cloud hosting.",
    defaultKeywords: "web development, AI automation, ERP, CRM, hosting, digital agency",
    canonicalDomain: "https://wall-v.com",
    defaultOGImage: "",
    defaultTwitterImage: "",
    siteName: "Wall-V",
    author: "Wall-V",
    organizationName: "Wall-V",
    organizationUrl: "https://wall-v.com",
    logo: "",
    defaultRobots: "index,follow",
    twitterHandle: "@wallv",
    facebookAppId: "",
  });
  const [healthStats, setHealthStats] = useState<SEOHealthStats | null>(null);
  const [saving, setSaving] = useState(false);
  const [checking, setChecking] = useState(false);
  const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({});
  const [saveMessage, setSaveMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [activeTab, setActiveTab] = useState<"global" | "preview" | "health">("global");

  useEffect(() => {
    if (status === "loading") return;
    if (status === "unauthenticated") {
      window.location.href = "/login?callbackUrl=/dashboard/marketing/seo";
      return;
    }
    fetchConfig();
    fetchHealthStats();
  }, [status]);

  const fetchConfig = async () => {
    try {
      const res = await fetch("/api/marketing/seo/global");
      const data = await res.json();
      if (data.success) {
        setConfig((prev) => ({ ...prev, ...data.data }));
      }
    } catch (error) {
      console.error("Failed to fetch config:", error);
    }
  };

  const fetchHealthStats = async () => {
    try {
      const res = await fetch("/api/marketing/seo/health");
      const data = await res.json();
      if (data.success) {
        setHealthStats(data.data);
      }
    } catch (error) {
      console.error("Failed to fetch health stats:", error);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setSaveMessage(null);
    try {
      const res = await fetch("/api/marketing/seo/global", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      });
      if (res.status === 401) { window.location.href = "/login?callbackUrl=/dashboard/marketing/seo"; return; }
      const data = await res.json();
      if (res.ok && data.success) {
        setSaveMessage({ type: "success", text: "Global SEO settings saved successfully" });
      } else {
        setSaveMessage({ type: "error", text: data.error || "Failed to save settings" });
      }
    } catch {
      setSaveMessage({ type: "error", text: "Network error. Please try again." });
    }
    setSaving(false);
  };

  const handleHealthCheck = async () => {
    setChecking(true);
    try {
      const res = await fetch("/api/marketing/seo/health", { method: "POST" });
      const data = await res.json();
      if (data.success) {
        setHealthStats(data.data);
        setSaveMessage({ type: "success", text: "SEO health check completed" });
      }
    } catch {
      setSaveMessage({ type: "error", text: "Health check failed" });
    } finally {
      setChecking(false);
    }
  };

  const toggleSecret = (key: string) => {
    setShowSecrets((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  if (status === "loading") {
    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold">Global SEO Settings</h2>
        <div className="rounded-lg border p-6 animate-pulse space-y-4">
          <div className="h-4 bg-muted rounded w-1/4" />
          <div className="h-4 bg-muted rounded w-1/2" />
          <div className="h-4 bg-muted rounded w-1/2" />
        </div>
      </div>
    );
  }

  if (!session) return null;

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://wall-v.com";
  const fullUrl = `${baseUrl}/example-page`;
  const ogImage = config.defaultOGImage || `${baseUrl}/og-default.png`;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Globe className="h-6 w-6 text-primary" />
            Global SEO Settings
          </h2>
          <p className="text-sm text-muted-foreground mt-1">Configure site-wide SEO defaults, Open Graph, Twitter cards, and structured data</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={handleHealthCheck} disabled={checking} className="inline-flex items-center gap-2 text-sm border rounded-lg px-3 py-2 hover:bg-accent transition-colors disabled:opacity-50">
            {checking ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            Run Health Check
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

      {/* Tabs */}
      <div className="flex gap-1 border-b">
        {[
          { id: "global", label: "Global Settings", icon: Globe },
          { id: "preview", label: "Preview", icon: Search },
          { id: "health", label: "SEO Health", icon: Zap },
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

      {/* Global Settings Tab */}
      {activeTab === "global" && (
        <div className="space-y-6">
          {/* Site Identity */}
          <div className="rounded-lg border p-6 space-y-6">
            <h3 className="font-semibold flex items-center gap-2">
              <Globe className="h-5 w-5" />
              Site Identity
            </h3>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Site Name</label>
                <input type="text" value={config.siteName} onChange={(e) => setConfig({ ...config, siteName: e.target.value })} className="mt-1 w-full rounded-lg border px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="text-sm font-medium">Default Page Title</label>
                <input type="text" value={config.siteTitle} onChange={(e) => setConfig({ ...config, siteTitle: e.target.value })} className="mt-1 w-full rounded-lg border px-3 py-2 text-sm" />
                <p className="text-xs text-muted-foreground mt-1">{config.siteTitle.length}/60 characters</p>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">Default Meta Description</label>
              <textarea value={config.siteDescription} onChange={(e) => setConfig({ ...config, siteDescription: e.target.value })} className="mt-1 w-full rounded-lg border px-3 py-2 text-sm" rows={3} />
              <p className="text-xs text-muted-foreground mt-1">{config.siteDescription.length}/160 characters</p>
            </div>
            <div>
              <label className="text-sm font-medium">Default Keywords (comma-separated)</label>
              <input type="text" value={config.defaultKeywords} onChange={(e) => setConfig({ ...config, defaultKeywords: e.target.value })} className="mt-1 w-full rounded-lg border px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="text-sm font-medium">Canonical Domain</label>
              <input type="url" value={config.canonicalDomain} onChange={(e) => setConfig({ ...config, canonicalDomain: e.target.value })} className="mt-1 w-full rounded-lg border px-3 py-2 text-sm" placeholder="https://wall-v.com" />
              <p className="text-xs text-muted-foreground mt-1">Primary domain for canonical URLs (no trailing slash)</p>
            </div>
            <div>
              <label className="text-sm font-medium">Author Name</label>
              <input type="text" value={config.author} onChange={(e) => setConfig({ ...config, author: e.target.value })} className="mt-1 w-full rounded-lg border px-3 py-2 text-sm" />
            </div>
          </div>

          {/* Organization (Structured Data) */}
          <div className="rounded-lg border p-6 space-y-6">
            <h3 className="font-semibold flex items-center gap-2">
              <Database className="h-5 w-5" />
              Organization (for Schema.org)
            </h3>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Organization Name</label>
                <input type="text" value={config.organizationName} onChange={(e) => setConfig({ ...config, organizationName: e.target.value })} className="mt-1 w-full rounded-lg border px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="text-sm font-medium">Organization URL</label>
                <input type="url" value={config.organizationUrl} onChange={(e) => setConfig({ ...config, organizationUrl: e.target.value })} className="mt-1 w-full rounded-lg border px-3 py-2 text-sm" />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">Logo URL (for Schema.org)</label>
              <input type="url" value={config.logo} onChange={(e) => setConfig({ ...config, logo: e.target.value })} className="mt-1 w-full rounded-lg border px-3 py-2 text-sm" placeholder="https://wall-v.com/logo.png" />
              <p className="text-xs text-muted-foreground mt-1">Used in Organization and WebSite structured data</p>
            </div>
          </div>

          {/* Social / Open Graph */}
          <div className="rounded-lg border p-6 space-y-6">
            <h3 className="font-semibold flex items-center gap-2">
              <Share2 className="h-5 w-5" />
              Open Graph & Twitter Cards
            </h3>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Default OG Image</label>
                <input type="url" value={config.defaultOGImage} onChange={(e) => setConfig({ ...config, defaultOGImage: e.target.value })} className="mt-1 w-full rounded-lg border px-3 py-2 text-sm" placeholder="https://wall-v.com/og-default.png" />
                <p className="text-xs text-muted-foreground mt-1">1200x630px recommended</p>
              </div>
              <div>
                <label className="text-sm font-medium">Default Twitter Image</label>
                <input type="url" value={config.defaultTwitterImage} onChange={(e) => setConfig({ ...config, defaultTwitterImage: e.target.value })} className="mt-1 w-full rounded-lg border px-3 py-2 text-sm" placeholder="https://wall-v.com/twitter-default.png" />
              </div>
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Twitter Handle</label>
                <input type="text" value={config.twitterHandle} onChange={(e) => setConfig({ ...config, twitterHandle: e.target.value })} className="mt-1 w-full rounded-lg border px-3 py-2 text-sm" placeholder="@wallv" />
              </div>
              <div>
                <label className="text-sm font-medium">Facebook App ID</label>
                <div className="relative mt-1">
                  <input
                    type={showSecrets.facebookAppId ? "text" : "password"}
                    value={config.facebookAppId}
                    onChange={(e) => setConfig({ ...config, facebookAppId: e.target.value })}
                    className="w-full rounded-lg border px-3 py-2 text-sm pr-10"
                  />
                  <button type="button" onClick={() => toggleSecret("facebookAppId")} className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-muted rounded">
                    {showSecrets.facebookAppId ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Robots Default */}
          <div className="rounded-lg border p-6 space-y-6">
            <h3 className="font-semibold flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Default Robots Policy
            </h3>
            <label className="flex items-center gap-3 cursor-pointer">
              <select value={config.defaultRobots} onChange={(e) => setConfig({ ...config, defaultRobots: e.target.value as GlobalSEOConfig["defaultRobots"] })} className="flex-1 max-w-xs rounded-lg border px-3 py-2 text-sm">
                <option value="index,follow">Index, Follow (Default)</option>
                <option value="noindex,follow">No Index, Follow</option>
                <option value="index,nofollow">Index, No Follow</option>
                <option value="noindex,nofollow">No Index, No Follow</option>
              </select>
            </label>
            <p className="text-xs text-muted-foreground">Default robots meta tag for pages without specific settings</p>
          </div>
        </div>
      )}

      {/* Preview Tab */}
      {activeTab === "preview" && (
        <div className="space-y-6">
          {/* Google Search Preview */}
          <div className="rounded-lg border p-6 bg-white">
            <h3 className="font-semibold mb-4 flex items-center gap-2 text-green-700">
              <Search className="h-5 w-5" />
              Google Search Preview
            </h3>
            <div className="rounded border p-4 bg-gray-50 font-sans">
              <div className="text-green-600 text-sm mb-1">{new URL(fullUrl).hostname}/example-page</div>
              <div className="text-xl font-medium text-blue-600 mb-1">{config.siteTitle}</div>
              <div className="text-sm text-gray-600">{config.siteDescription}</div>
            </div>
            <p className="text-xs text-muted-foreground mt-2">This is how your homepage may appear in Google search results</p>
          </div>

          {/* Open Graph Preview */}
          <div className="rounded-lg border p-6 bg-white">
            <h3 className="font-semibold mb-4 flex items-center gap-2 text-blue-700">
              <Share2 className="h-5 w-5" />
              Open Graph Preview (Facebook, LinkedIn, etc.)
            </h3>
            <div className="rounded border overflow-hidden bg-white max-w-md">
              {config.defaultOGImage && (
                <img src={config.defaultOGImage} alt="OG Preview" className="w-full h-48 object-cover" />
              )}
              <div className="p-4">
                <div className="font-semibold text-gray-900">{config.siteTitle}</div>
                <div className="text-sm text-gray-600 mt-1">{config.siteDescription}</div>
                <div className="text-xs text-gray-400 mt-2">{config.siteName}</div>
              </div>
            </div>
            {!config.defaultOGImage && <p className="text-xs text-muted-foreground mt-2">No OG image configured</p>}
          </div>

          {/* Twitter Card Preview */}
          <div className="rounded-lg border p-6 bg-white">
            <h3 className="font-semibold mb-4 flex items-center gap-2 text-sky-700">
              <Share2 className="h-5 w-5" />
              Twitter/X Card Preview
            </h3>
            <div className="rounded border overflow-hidden bg-white max-w-md">
              {config.defaultTwitterImage && (
                <img src={config.defaultTwitterImage} alt="Twitter Preview" className="w-full h-48 object-cover" />
              )}
              <div className="p-4">
                <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
                  <span>@{config.twitterHandle.replace("@", "")}</span>
                  <span>·</span>
                  <span>Summary Large Image</span>
                </div>
                <div className="font-semibold text-gray-900">{config.siteTitle}</div>
                <div className="text-sm text-gray-600 mt-1">{config.siteDescription}</div>
              </div>
            </div>
            {!config.defaultTwitterImage && <p className="text-xs text-muted-foreground mt-2">No Twitter image configured</p>}
          </div>

          {/* Structured Data Preview */}
          <div className="rounded-lg border p-6 bg-white">
            <h3 className="font-semibold mb-4 flex items-center gap-2 text-purple-700">
              <Database className="h-5 w-5" />
              Organization Structured Data (JSON-LD)
            </h3>
            <pre className="bg-gray-100 p-4 rounded text-xs overflow-x-auto text-gray-800">
{JSON.stringify({
  "@context": "https://schema.org",
  "@type": "Organization",
  name: config.organizationName,
  url: config.organizationUrl,
  logo: config.logo,
  sameAs: [],
  contactPoint: {
    "@type": "ContactPoint",
    contactType: "customer service",
  },
}, null, 2)}
            </pre>
          </div>
        </div>
      )}

      {/* Health Tab */}
      {activeTab === "health" && (
        <div className="space-y-6">
          <div className="grid gap-4 md:grid-cols-4">
            {[
              { label: "Total Pages", value: healthStats?.totalPages || 0, icon: FileText, color: "text-blue-500" },
              { label: "Passed", value: healthStats?.passed || 0, icon: CheckCircle2, color: "text-green-500" },
              { label: "Warnings", value: healthStats?.warnings || 0, icon: AlertCircle, color: "text-amber-500" },
              { label: "Critical", value: healthStats?.critical || 0, icon: AlertCircle, color: "text-red-500" },
            ].map((stat) => (
              <div key={stat.label} className="rounded-lg border p-6">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                  <stat.icon className={cn("h-5 w-5", stat.color)} />
                </div>
                <p className="mt-2 text-3xl font-bold">{stat.value}</p>
              </div>
            ))}
          </div>

          {healthStats?.lastChecked && (
            <p className="text-sm text-muted-foreground">Last checked: {new Date(healthStats.lastChecked).toLocaleString()}</p>
          )}

          <div className="rounded-lg border p-6 bg-blue-50 border-blue-200">
            <h3 className="font-semibold text-blue-900 mb-3 flex items-center gap-2">
              <Zap className="h-5 w-5" />
              SEO Health Checks Performed
            </h3>
            <ul className="space-y-1 text-sm text-blue-800 list-disc list-inside">
              <li>Missing or duplicate <code>title</code> tags</li>
              <li>Missing or duplicate <code>meta description</code></li>
              <li>Missing <code>canonical</code> URLs</li>
              <li>Missing Open Graph tags (<code>og:title</code>, <code>og:description</code>, <code>og:image</code>)</li>
              <li>Missing Twitter Card tags</li>
              <li>Missing or invalid structured data (JSON-LD)</li>
              <li>Broken canonical URLs (404, redirect loops)</li>
              <li><code>noindex</code> on public pages</li>
              <li>Robots.txt blocking important pages</li>
              <li>Missing sitemap entries for public pages</li>
              <li>Duplicate metadata across pages</li>
              <li>Missing product schema fields (price, availability, etc.)</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}