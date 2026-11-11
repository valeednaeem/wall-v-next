"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { Save, Loader2, CheckCircle2, AlertCircle, ExternalLink, RefreshCw, Eye, EyeOff, Key, FileText, Globe, Link2, Unlink } from "lucide-react";
import { cn } from "@/lib/utils";

interface SearchConsoleConfig {
  propertyUrl: string;
  verificationMethod: "html_tag" | "html_file" | "dns" | "analytics" | "tag_manager";
  verificationCode: string;
  sitemapUrl: string;
}

export default function SearchConsolePage() {
  const { data: session, status } = useSession();
  const [config, setConfig] = useState<SearchConsoleConfig>({
    propertyUrl: "",
    verificationMethod: "html_tag",
    verificationCode: "",
    sitemapUrl: "",
  });
  const [statusInfo, setStatusInfo] = useState<{
    status: string;
    lastTested?: string;
    lastSynced?: string;
    lastError?: string;
    details?: Record<string, string>;
  } | null>(null);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [submittingSitemap, setSubmittingSitemap] = useState(false);
  const [reconnecting, setReconnecting] = useState(false);
  const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({});
  const [saveMessage, setSaveMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    if (status === "loading") return;
    if (status === "unauthenticated") {
      window.location.href = "/login?callbackUrl=/dashboard/marketing/google/search-console";
      return;
    }
    fetchConfig();
  }, [status]);

  const fetchConfig = async () => {
    try {
      const res = await fetch("/api/marketing/google/services/search_console");
      const data = await res.json();
      if (data.success) {
        setConfig((prev) => ({ ...prev, ...data.data.config }));
        setStatusInfo({
          status: data.data.status,
          lastTested: data.data.lastTested,
          lastSynced: data.data.lastSynced,
          lastError: data.data.lastError,
          details: data.data.details,
        });
      }
    } catch (error) {
      console.error("Failed to fetch config:", error);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setSaveMessage(null);
    try {
      const res = await fetch("/api/marketing/google/services/search_console", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      });
      if (res.status === 401) { window.location.href = "/login?callbackUrl=/dashboard/marketing/google/search-console"; return; }
      const data = await res.json();
      if (res.ok && data.success) {
        setSaveMessage({ type: "success", text: "Search Console configuration saved successfully" });
        fetchConfig();
      } else {
        setSaveMessage({ type: "error", text: data.error || "Failed to save configuration" });
      }
    } catch {
      setSaveMessage({ type: "error", text: "Network error. Please try again." });
    }
    setSaving(false);
  };

  const handleTest = async () => {
    setTesting(true);
    try {
      const res = await fetch("/api/marketing/google/services/search_console/test", { method: "POST" });
      const data = await res.json();
      if (data.success) {
        fetchConfig();
      }
    } catch (error) {
      console.error("Test failed:", error);
    } finally {
      setTesting(false);
    }
  };

  const handleSubmitSitemap = async () => {
    if (!config.sitemapUrl) {
      setSaveMessage({ type: "error", text: "Please enter a sitemap URL first" });
      return;
    }
    setSubmittingSitemap(true);
    try {
      const res = await fetch("/api/marketing/google/search-console/sitemap", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sitemapUrl: config.sitemapUrl }),
      });
      const data = await res.json();
      if (data.success) {
        setSaveMessage({ type: "success", text: "Sitemap submitted successfully" });
        fetchConfig();
      } else {
        setSaveMessage({ type: "error", text: data.error || "Failed to submit sitemap" });
      }
    } catch {
      setSaveMessage({ type: "error", text: "Network error. Please try again." });
    } finally {
      setSubmittingSitemap(false);
    }
  };

  const toggleSecret = (key: string) => {
    setShowSecrets((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleReconnect = async () => {
    setReconnecting(true);
    try {
      const res = await fetch("/api/auth/google/connect");
      const data = await res.json();
      if (data.success && data.data.authUrl) {
        window.location.href = data.data.authUrl;
      }
    } catch (error) {
      console.error("Failed to reconnect:", error);
    } finally {
      setReconnecting(false);
    }
  };

  const getStatusConfig = (status: string) => {
    const configs: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
      not_configured: { label: "Not configured", color: "bg-gray-100 text-gray-700", icon: <AlertCircle className="h-3.5 w-3.5" /> },
      config_required: { label: "Configuration required", color: "bg-amber-100 text-amber-700", icon: <Key className="h-3.5 w-3.5" /> },
      auth_required: { label: "Authorization required", color: "bg-blue-100 text-blue-700", icon: <Globe className="h-3.5 w-3.5" /> },
      connected: { label: "Connected", color: "bg-green-100 text-green-700", icon: <CheckCircle2 className="h-3.5 w-3.5" /> },
      connection_failed: { label: "Connection failed", color: "bg-red-100 text-red-700", icon: <AlertCircle className="h-3.5 w-3.5" /> },
      token_expired: { label: "Token expired", color: "bg-amber-100 text-amber-700", icon: <RefreshCw className="h-3.5 w-3.5 animate-spin" /> },
      permission_denied: { label: "Permission denied", color: "bg-red-100 text-red-700", icon: <AlertCircle className="h-3.5 w-3.5" /> },
      syncing: { label: "Testing...", color: "bg-blue-100 text-blue-700", icon: <Loader2 className="h-3.5 w-3.5 animate-spin" /> },
      sync_completed: { label: "Test passed", color: "bg-green-100 text-green-700", icon: <CheckCircle2 className="h-3.5 w-3.5" /> },
      sync_failed: { label: "Test failed", color: "bg-red-100 text-red-700", icon: <AlertCircle className="h-3.5 w-3.5" /> },
    };
    return configs[status] || configs.not_configured;
  };

  if (status === "loading") {
    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold">Google Search Console</h2>
        <div className="rounded-lg border p-6 animate-pulse space-y-4">
          <div className="h-4 bg-muted rounded w-1/4" />
          <div className="h-4 bg-muted rounded w-1/2" />
          <div className="h-4 bg-muted rounded w-1/2" />
        </div>
      </div>
    );
  }

  if (!session) return null;

  const currentStatus = statusInfo?.status || "not_configured";
  const statusConfig = getStatusConfig(currentStatus);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <span className="h-6 w-6 bg-primary/10 rounded-lg flex items-center justify-center text-primary font-bold text-xs">GSC</span>
            Google Search Console
          </h2>
          <p className="text-sm text-muted-foreground mt-1">Monitor search performance, submit sitemaps, and verify site ownership</p>
        </div>
        <div className="flex items-center gap-3">
          <span className={cn("inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium", statusConfig.color)}>
            {statusConfig.icon} {statusConfig.label}
          </span>
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

      {/* Auth Required Warning */}
      {currentStatus === "auth_required" && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5 shrink-0" />
          <div>
            <h4 className="font-semibold text-amber-800">Google Account Needs Reconnection</h4>
            <p className="text-sm text-amber-700 mt-1">
              Your Google account was connected before Search Console permissions were available.
              Click <strong>Reconnect Google Account</strong> below to grant all required permissions including Search Console access.
            </p>
          </div>
        </div>
      )}

      {/* Connection Status Card */}
      <div className="rounded-lg border p-6">
        <h3 className="font-semibold mb-4">Connection Status</h3>
        <div className="grid md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">Status</p>
            <span className={cn("inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium", statusConfig.color)}>
              {statusConfig.icon} {statusConfig.label}
            </span>
          </div>
          {statusInfo?.lastTested && (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Last Verified</p>
              <p className="font-medium">{new Date(statusInfo.lastTested).toLocaleString()}</p>
            </div>
          )}
          {statusInfo?.lastSynced && (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Last Sitemap Sync</p>
              <p className="font-medium">{new Date(statusInfo.lastSynced).toLocaleString()}</p>
            </div>
          )}
        </div>
        {statusInfo?.lastError && (
          <div className="mt-4 p-3 rounded bg-red-50 border border-red-200">
            <p className="text-sm text-red-700"><strong>Last Error:</strong> {statusInfo.lastError}</p>
          </div>
        )}
        {statusInfo?.details?.propertyUrl && (
          <div className="mt-4 p-3 rounded bg-blue-50 border border-blue-200">
            <p className="text-sm text-blue-700"><strong>Property:</strong> {statusInfo.details.propertyUrl}</p>
          </div>
        )}
        <div className="mt-4 flex flex-wrap gap-2">
          <button onClick={handleTest} disabled={testing} className="inline-flex items-center gap-2 text-sm border rounded-lg px-3 py-2 hover:bg-accent transition-colors disabled:opacity-50">
            {testing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            Verify Connection
          </button>
          {currentStatus === "auth_required" && (
            <button onClick={handleReconnect} disabled={reconnecting} className="inline-flex items-center gap-2 text-sm bg-amber-500 text-white rounded-lg px-3 py-2 hover:bg-amber-600 transition-colors disabled:opacity-50">
              {reconnecting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Link2 className="h-4 w-4" />}
              Reconnect Google Account
            </button>
          )}
          <a href="https://search.google.com/search-console" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-sm border rounded-lg px-3 py-2 hover:bg-accent transition-colors">
            <ExternalLink className="h-4 w-4" />
            Open Search Console
          </a>
        </div>
      </div>

      {/* Configuration Form */}
      <div className="rounded-lg border p-6 space-y-6">
        <h3 className="font-semibold">Site Verification</h3>

        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium">Property URL <span className="text-red-500">*</span></label>
            <input
              type="url"
              value={config.propertyUrl}
              onChange={(e) => setConfig({ ...config, propertyUrl: e.target.value })}
              className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
              placeholder="https://www.yourdomain.com"
            />
            <p className="text-xs text-muted-foreground mt-1">Enter the exact URL as shown in Search Console (including protocol and www if applicable)</p>
          </div>

          <div>
            <label className="text-sm font-medium">Verification Method</label>
            <select
              value={config.verificationMethod}
              onChange={(e) => setConfig({ ...config, verificationMethod: e.target.value as SearchConsoleConfig["verificationMethod"] })}
              className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
            >
              <option value="html_tag">HTML Tag (Recommended)</option>
              <option value="html_file">HTML File Upload</option>
              <option value="dns">DNS Record</option>
              <option value="analytics">Google Analytics</option>
              <option value="tag_manager">Google Tag Manager</option>
            </select>
            <p className="text-xs text-muted-foreground mt-1">Choose how you verified site ownership in Search Console</p>
          </div>

          <div>
            <label className="text-sm font-medium">Verification Code / Value</label>
            <div className="relative mt-1">
              <input
                type={showSecrets.verificationCode ? "text" : "password"}
                value={config.verificationCode}
                onChange={(e) => setConfig({ ...config, verificationCode: e.target.value })}
                className="w-full rounded-lg border px-3 py-2 text-sm pr-10 font-mono"
                placeholder="Verification code from Search Console"
              />
              <button type="button" onClick={() => toggleSecret("verificationCode")} className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-muted rounded">
                {showSecrets.verificationCode ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <p className="text-xs text-muted-foreground mt-1">Paste the verification meta tag content or file name from Search Console</p>
          </div>
        </div>

        <div className="pt-4 border-t space-y-4">
          <h4 className="font-medium">Sitemap Management</h4>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Sitemap URL</label>
              <div className="mt-1 flex gap-2">
                <input
                  type="url"
                  value={config.sitemapUrl}
                  onChange={(e) => setConfig({ ...config, sitemapUrl: e.target.value })}
                  className="flex-1 rounded-lg border px-3 py-2 text-sm"
                  placeholder="https://yourdomain.com/sitemap.xml"
                />
                <button
                  onClick={handleSubmitSitemap}
                  disabled={submittingSitemap || !config.sitemapUrl}
                  className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50"
                >
                  {submittingSitemap ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
                  Submit to Google
                </button>
              </div>
              <p className="text-xs text-muted-foreground mt-1">Your sitemap is typically at <code className="bg-gray-100 px-1 rounded">/sitemap.xml</code> or configured in SEO settings</p>
            </div>
          </div>
        </div>
      </div>

      {/* Implementation Guide */}
      <div className="rounded-lg border p-6 bg-blue-50 border-blue-200">
        <h3 className="font-semibold text-blue-900 mb-3 flex items-center gap-2">
          <Key className="h-5 w-5" />
          Setup Instructions
        </h3>
        <ol className="space-y-2 text-sm text-blue-800 list-decimal list-inside">
          <li>Go to <a href="https://search.google.com/search-console" target="_blank" rel="noopener noreferrer" className="underline">Google Search Console</a></li>
          <li>Add a property (URL prefix recommended)</li>
          <li>Choose <strong>HTML Tag</strong> verification method</li>
          <li>Copy the <code>content</code> value from the meta tag</li>
          <li>Paste it in the <strong>Verification Code</strong> field above</li>
          <li>Click <strong>Verify Connection</strong> to test</li>
          <li>Submit your sitemap using the button above</li>
        </ol>
      </div>
    </div>
  );
}