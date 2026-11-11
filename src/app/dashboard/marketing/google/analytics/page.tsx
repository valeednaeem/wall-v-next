"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { Save, Loader2, CheckCircle2, AlertCircle, ExternalLink, RefreshCw, Eye, EyeOff, Key } from "lucide-react";
import { cn } from "@/lib/utils";

interface AnalyticsConfig {
  measurementId: string;
  propertyId: string;
  dataStreamId: string;
  debugMode: boolean;
  consentMode: "default" | "advanced";
  apiSecret: string;
}

export default function AnalyticsPage() {
  const { data: session, status } = useSession();
  const [config, setConfig] = useState<AnalyticsConfig>({
    measurementId: "",
    propertyId: "",
    dataStreamId: "",
    debugMode: false,
    consentMode: "default",
    apiSecret: "",
  });
  const [statusInfo, setStatusInfo] = useState<{
    status: string;
    lastTested?: string;
    lastError?: string;
    details?: Record<string, string>;
  } | null>(null);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({});
  const [saveMessage, setSaveMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    if (status === "loading") return;
    if (status === "unauthenticated") {
      window.location.href = "/login?callbackUrl=/dashboard/marketing/google/analytics";
      return;
    }
    fetchConfig();
  }, [status]);

  const fetchConfig = async () => {
    try {
      const res = await fetch("/api/marketing/google/services/analytics");
      const data = await res.json();
      if (data.success) {
        setConfig((prev) => ({ ...prev, ...data.data.config }));
        setStatusInfo({
          status: data.data.status,
          lastTested: data.data.lastTested,
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
      const res = await fetch("/api/marketing/google/services/analytics", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      });
      if (res.status === 401) { window.location.href = "/login?callbackUrl=/dashboard/marketing/google/analytics"; return; }
      const data = await res.json();
      if (res.ok && data.success) {
        setSaveMessage({ type: "success", text: "Analytics configuration saved successfully" });
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
      const res = await fetch("/api/marketing/google/services/analytics/test", { method: "POST" });
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

  const toggleSecret = (key: string) => {
    setShowSecrets((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const getStatusConfig = (status: string) => {
    const configs: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
      not_configured: { label: "Not configured", color: "bg-gray-100 text-gray-700", icon: <AlertCircle className="h-3.5 w-3.5" /> },
      config_required: { label: "Configuration required", color: "bg-amber-100 text-amber-700", icon: <Key className="h-3.5 w-3.5" /> },
      auth_required: { label: "Authorization required", color: "bg-blue-100 text-blue-700", icon: <ExternalLink className="h-3.5 w-3.5" /> },
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
        <h2 className="text-2xl font-bold">Google Analytics</h2>
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
            <span className="h-6 w-6 bg-primary/10 rounded-lg flex items-center justify-center text-primary font-bold text-sm">GA4</span>
            Google Analytics (GA4)
          </h2>
          <p className="text-sm text-muted-foreground mt-1">Configure GA4 Measurement ID, property settings, and debug mode</p>
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
              <p className="text-sm text-muted-foreground">Last Tested</p>
              <p className="font-medium">{new Date(statusInfo.lastTested).toLocaleString()}</p>
            </div>
          )}
          {statusInfo?.details?.measurementId && (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Measurement ID</p>
              <p className="font-medium font-mono text-sm">{statusInfo.details.measurementId}</p>
            </div>
          )}
        </div>
        {statusInfo?.lastError && (
          <div className="mt-4 p-3 rounded bg-red-50 border border-red-200">
            <p className="text-sm text-red-700"><strong>Last Error:</strong> {statusInfo.lastError}</p>
          </div>
        )}
        <div className="mt-4 flex gap-2">
          <button onClick={handleTest} disabled={testing} className="inline-flex items-center gap-2 text-sm border rounded-lg px-3 py-2 hover:bg-accent transition-colors disabled:opacity-50">
            {testing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            Test Connection
          </button>
          <a href="https://analytics.google.com/" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-sm border rounded-lg px-3 py-2 hover:bg-accent transition-colors">
            <ExternalLink className="h-4 w-4" />
            Open GA4 Dashboard
          </a>
        </div>
      </div>

      {/* Configuration Form */}
      <div className="rounded-lg border p-6 space-y-6">
        <h3 className="font-semibold">Configuration</h3>

        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium">Measurement ID <span className="text-red-500">*</span></label>
            <div className="relative mt-1">
              <input
                type="text"
                value={config.measurementId}
                onChange={(e) => setConfig({ ...config, measurementId: e.target.value })}
                className="w-full rounded-lg border px-3 py-2 text-sm pr-10"
                placeholder="G-XXXXXXXXXX"
              />
              <button type="button" onClick={() => toggleSecret("measurementId")} className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-muted rounded">
                {showSecrets.measurementId ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <p className="text-xs text-muted-foreground mt-1">Found in GA4 Admin → Data Streams → Web stream details</p>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">Property ID</label>
              <input
                type="text"
                value={config.propertyId}
                onChange={(e) => setConfig({ ...config, propertyId: e.target.value })}
                className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
                placeholder="123456789"
              />
              <p className="text-xs text-muted-foreground mt-1">Numeric property ID from GA4 Admin → Property Settings</p>
            </div>
            <div>
              <label className="text-sm font-medium">Data Stream ID</label>
              <input
                type="text"
                value={config.dataStreamId}
                onChange={(e) => setConfig({ ...config, dataStreamId: e.target.value })}
                className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
                placeholder="1234567890"
              />
              <p className="text-xs text-muted-foreground mt-1">Found in Data Stream details</p>
            </div>
          </div>

          <div>
            <label className="text-sm font-medium">API Secret (for Measurement Protocol)</label>
            <div className="relative mt-1">
              <input
                type={showSecrets.apiSecret ? "text" : "password"}
                value={config.apiSecret}
                onChange={(e) => setConfig({ ...config, apiSecret: e.target.value })}
                className="w-full rounded-lg border px-3 py-2 text-sm pr-10"
                placeholder="Optional — for server-side events"
              />
              <button type="button" onClick={() => toggleSecret("apiSecret")} className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-muted rounded">
                {showSecrets.apiSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <p className="text-xs text-muted-foreground mt-1">Required for server-side event tracking. Create in GA4 Admin → Data Stream → Measurement Protocol API Secrets</p>
          </div>
        </div>

        <div className="pt-4 border-t space-y-4">
          <h4 className="font-medium">Advanced Settings</h4>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.debugMode}
                  onChange={(e) => setConfig({ ...config, debugMode: e.target.checked })}
                  className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                />
                <span className="text-sm">Debug Mode</span>
              </label>
              <p className="text-xs text-muted-foreground mt-1 ml-6">Enable debug_view in GA4 for real-time event debugging</p>
            </div>
            <div>
              <label className="text-sm font-medium">Consent Mode</label>
              <select
                value={config.consentMode}
                onChange={(e) => setConfig({ ...config, consentMode: e.target.value as "default" | "advanced" })}
                className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
              >
                <option value="default">Default (basic)</option>
                <option value="advanced">Advanced (with redacted data)</option>
              </select>
              <p className="text-xs text-muted-foreground mt-1">Configure how GA4 behaves before user consent</p>
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
          <li>Go to <a href="https://analytics.google.com/" target="_blank" rel="noopener noreferrer" className="underline">Google Analytics</a> and create a GA4 property</li>
          <li>Create a Web Data Stream for your domain</li>
          <li>Copy the <strong>Measurement ID</strong> (format: G-XXXXXXXXXX)</li>
          <li>For server-side events: Admin → Data Stream → Measurement Protocol API Secrets → Create</li>
          <li>Paste the Measurement ID and API Secret above, then click <strong>Test Connection</strong></li>
        </ol>
      </div>
    </div>
  );
}