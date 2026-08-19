"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { Save, Loader2, CheckCircle2, AlertCircle, ExternalLink, RefreshCw, Eye, EyeOff, Key, Building2, Star, MessageSquare, MapPin } from "lucide-react";
import { cn } from "@/lib/utils";

interface BusinessProfileConfig {
  accountId: string;
  locationIds: string[];
  autoSyncReviews: boolean;
  autoSyncPosts: boolean;
}

export default function BusinessProfilePage() {
  const { data: session, status } = useSession();
  const [config, setConfig] = useState<BusinessProfileConfig>({
    accountId: "",
    locationIds: [],
    autoSyncReviews: false,
    autoSyncPosts: false,
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
  const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({});
  const [saveMessage, setSaveMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    if (status === "loading") return;
    if (status === "unauthenticated") {
      window.location.href = "/login?callbackUrl=/dashboard/marketing/google/business-profile";
      return;
    }
    fetchConfig();
  }, [status]);

  const fetchConfig = async () => {
    try {
      const res = await fetch("/api/marketing/google/services/business_profile");
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
      const res = await fetch("/api/marketing/google/services/business_profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      });
      if (res.status === 401) { window.location.href = "/login?callbackUrl=/dashboard/marketing/google/business-profile"; return; }
      const data = await res.json();
      if (res.ok && data.success) {
        setSaveMessage({ type: "success", text: "Business Profile configuration saved successfully" });
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
      const res = await fetch("/api/marketing/google/services/business_profile/test", { method: "POST" });
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
      auth_required: { label: "Authorization required", color: "bg-blue-100 text-blue-700", icon: <Building2 className="h-3.5 w-3.5" /> },
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
        <h2 className="text-2xl font-bold">Google Business Profile</h2>
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
            <span className="h-6 w-6 bg-primary/10 rounded-lg flex items-center justify-center text-primary font-bold text-xs">GBP</span>
            Google Business Profile
          </h2>
          <p className="text-sm text-muted-foreground mt-1">Manage business listings, reviews, posts, and local presence</p>
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
              <p className="text-sm text-muted-foreground">Last Verified</p>
              <p className="font-medium">{new Date(statusInfo.lastTested).toLocaleString()}</p>
            </div>
          )}
          {statusInfo?.lastSynced && (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Last Synced</p>
              <p className="font-medium">{new Date(statusInfo.lastSynced).toLocaleString()}</p>
            </div>
          )}
        </div>
        {statusInfo?.lastError && (
          <div className="mt-4 p-3 rounded bg-red-50 border border-red-200">
            <p className="text-sm text-red-700"><strong>Last Error:</strong> {statusInfo.lastError}</p>
          </div>
        )}
        {statusInfo?.details?.accountId && (
          <div className="mt-4 p-3 rounded bg-blue-50 border border-blue-200">
            <p className="text-sm text-blue-700"><strong>Account ID:</strong> {statusInfo.details.accountId}</p>
          </div>
        )}
        <div className="mt-4 flex flex-wrap gap-2">
          <button onClick={handleTest} disabled={testing} className="inline-flex items-center gap-2 text-sm border rounded-lg px-3 py-2 hover:bg-accent transition-colors disabled:opacity-50">
            {testing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            Verify Connection
          </button>
          <a href="https://business.google.com/" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-sm border rounded-lg px-3 py-2 hover:bg-accent transition-colors">
            <ExternalLink className="h-4 w-4" />
            Open Business Profile
          </a>
        </div>
      </div>

      {/* Configuration Form */}
      <div className="rounded-lg border p-6 space-y-6">
        <h3 className="font-semibold">Configuration</h3>

        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium">Business Account ID <span className="text-red-500">*</span></label>
            <div className="relative mt-1">
              <input
                type="text"
                value={config.accountId}
                onChange={(e) => setConfig({ ...config, accountId: e.target.value })}
                className="w-full rounded-lg border px-3 py-2 text-sm pr-10"
                placeholder="12345678901234567890"
              />
              <button type="button" onClick={() => toggleSecret("accountId")} className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-muted rounded">
                {showSecrets.accountId ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <p className="text-xs text-muted-foreground mt-1">Found in Business Profile Manager → Settings → Account ID</p>
          </div>

          <div>
            <label className="text-sm font-medium">Location IDs (comma-separated)</label>
            <textarea
              value={config.locationIds.join(", ")}
              onChange={(e) => setConfig({ ...config, locationIds: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) })}
              className="mt-1 w-full rounded-lg border px-3 py-2 text-sm font-mono"
              rows={2}
              placeholder="123456789, 987654321"
            />
            <p className="text-xs text-muted-foreground mt-1">Optional — leave empty to sync all locations under this account</p>
          </div>
        </div>

        <div className="pt-4 border-t space-y-4">
          <h4 className="font-medium">Automation Settings</h4>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.autoSyncReviews}
                  onChange={(e) => setConfig({ ...config, autoSyncReviews: e.target.checked })}
                  className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                />
                <span className="text-sm">Auto-sync Reviews</span>
              </label>
              <p className="text-xs text-muted-foreground mt-1 ml-6">Automatically fetch new reviews from Google</p>
            </div>
            <div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.autoSyncPosts}
                  onChange={(e) => setConfig({ ...config, autoSyncPosts: e.target.checked })}
                  className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                />
                <span className="text-sm">Auto-sync Posts</span>
              </label>
              <p className="text-xs text-muted-foreground mt-1 ml-6">Automatically fetch Google Business posts</p>
            </div>
          </div>
        </div>
      </div>

      {/* Features Overview */}
      <div className="rounded-lg border p-6 bg-green-50 border-green-200">
        <h3 className="font-semibold text-green-900 mb-3 flex items-center gap-2">
          <Building2 className="h-5 w-5" />
          Available Features (when connected)
        </h3>
        <div className="grid md:grid-cols-2 gap-3 text-sm text-green-800">
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4" />
            <span>Location management</span>
          </div>
          <div className="flex items-center gap-2">
            <Star className="h-4 w-4" />
            <span>Review monitoring & responses</span>
          </div>
          <div className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            <span>Google Posts creation</span>
          </div>
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            <span>Performance insights</span>
          </div>
          <div className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            <span>Q&A management</span>
          </div>
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4" />
            <span>Local SEO optimization</span>
          </div>
        </div>
        <p className="text-xs text-green-700 mt-3">
          <strong>Note:</strong> Google Business Profile API requires OAuth authorization and a verified business account.
          Features shown require proper API access granted by Google.
        </p>
      </div>
    </div>
  );
}