"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { Save, Loader2, CheckCircle2, AlertCircle, ExternalLink, RefreshCw, Eye, EyeOff, Key, Package, RotateCw, TrendingUp, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

interface MerchantCenterConfig {
  merchantId: string;
  dataSourceId: string;
  autoSync: boolean;
  syncFrequency: "manual" | "hourly" | "daily" | "weekly";
}

interface ProductSyncStatus {
  total: number;
  synced: number;
  pending: number;
  approved: number;
  rejected: number;
  issues: number;
}

export default function MerchantCenterPage() {
  const { data: session, status } = useSession();
  const [config, setConfig] = useState<MerchantCenterConfig>({
    merchantId: "",
    dataSourceId: "",
    autoSync: false,
    syncFrequency: "manual",
  });
  const [statusInfo, setStatusInfo] = useState<{
    status: string;
    lastTested?: string;
    lastSynced?: string;
    lastError?: string;
    details?: Record<string, string>;
  } | null>(null);
  const [syncStatus, setSyncStatus] = useState<ProductSyncStatus | null>(null);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({});
  const [saveMessage, setSaveMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    if (status === "loading") return;
    if (status === "unauthenticated") {
      window.location.href = "/login?callbackUrl=/dashboard/marketing/google/merchant-center";
      return;
    }
    fetchConfig();
    fetchSyncStatus();
  }, [status]);

  const fetchConfig = async () => {
    try {
      const res = await fetch("/api/marketing/google/services/merchant_center");
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

  const fetchSyncStatus = async () => {
    try {
      const res = await fetch("/api/marketing/google/merchant-center/sync-status");
      const data = await res.json();
      if (data.success) {
        setSyncStatus(data.data);
      }
    } catch (error) {
      console.error("Failed to fetch sync status:", error);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setSaveMessage(null);
    try {
      const res = await fetch("/api/marketing/google/services/merchant_center", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      });
      if (res.status === 401) { window.location.href = "/login?callbackUrl=/dashboard/marketing/google/merchant-center"; return; }
      const data = await res.json();
      if (res.ok && data.success) {
        setSaveMessage({ type: "success", text: "Merchant Center configuration saved successfully" });
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
      const res = await fetch("/api/marketing/google/services/merchant_center/test", { method: "POST" });
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

  const handleSync = async () => {
    setSyncing(true);
    try {
      const res = await fetch("/api/marketing/google/merchant-center/sync", { method: "POST" });
      const data = await res.json();
      if (data.success) {
        setSaveMessage({ type: "success", text: `Sync initiated: ${data.data.message}` });
        fetchSyncStatus();
        fetchConfig();
      } else {
        setSaveMessage({ type: "error", text: data.error || "Sync failed" });
      }
    } catch {
      setSaveMessage({ type: "error", text: "Network error. Please try again." });
    } finally {
      setSyncing(false);
    }
  };

  const toggleSecret = (key: string) => {
    setShowSecrets((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const getStatusConfig = (status: string) => {
    const configs: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
      not_configured: { label: "Not configured", color: "bg-gray-100 text-gray-700", icon: <AlertCircle className="h-3.5 w-3.5" /> },
      config_required: { label: "Configuration required", color: "bg-amber-100 text-amber-700", icon: <Key className="h-3.5 w-3.5" /> },
      auth_required: { label: "Authorization required", color: "bg-blue-100 text-blue-700", icon: <Package className="h-3.5 w-3.5" /> },
      connected: { label: "Connected", color: "bg-green-100 text-green-700", icon: <CheckCircle2 className="h-3.5 w-3.5" /> },
      connection_failed: { label: "Connection failed", color: "bg-red-100 text-red-700", icon: <AlertCircle className="h-3.5 w-3.5" /> },
      token_expired: { label: "Token expired", color: "bg-amber-100 text-amber-700", icon: <RefreshCw className="h-3.5 w-3.5 animate-spin" /> },
      permission_denied: { label: "Permission denied", color: "bg-red-100 text-red-700", icon: <AlertCircle className="h-3.5 w-3.5" /> },
      syncing: { label: "Syncing...", color: "bg-blue-100 text-blue-700", icon: <Loader2 className="h-3.5 w-3.5 animate-spin" /> },
      sync_completed: { label: "Sync completed", color: "bg-green-100 text-green-700", icon: <CheckCircle2 className="h-3.5 w-3.5" /> },
      sync_failed: { label: "Sync failed", color: "bg-red-100 text-red-700", icon: <AlertTriangle className="h-3.5 w-3.5" /> },
    };
    return configs[status] || configs.not_configured;
  };

  if (status === "loading") {
    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold">Google Merchant Center</h2>
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
            <span className="h-6 w-6 bg-primary/10 rounded-lg flex items-center justify-center text-primary font-bold text-xs">GMC</span>
            Google Merchant Center
          </h2>
          <p className="text-sm text-muted-foreground mt-1">Sync products for Google Shopping, free listings, and local inventory</p>
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
        {statusInfo?.details?.merchantId && (
          <div className="mt-4 p-3 rounded bg-blue-50 border border-blue-200">
            <p className="text-sm text-blue-700"><strong>Merchant ID:</strong> {statusInfo.details.merchantId}</p>
          </div>
        )}
        <div className="mt-4 flex flex-wrap gap-2">
          <button onClick={handleTest} disabled={testing} className="inline-flex items-center gap-2 text-sm border rounded-lg px-3 py-2 hover:bg-accent transition-colors disabled:opacity-50">
            {testing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            Test Connection
          </button>
          <button onClick={handleSync} disabled={syncing || currentStatus !== "connected"} className="inline-flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50">
            {syncing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCw className="h-4 w-4" />}
            Sync Products Now
          </button>
          <a href="https://merchants.google.com/" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-sm border rounded-lg px-3 py-2 hover:bg-accent transition-colors">
            <ExternalLink className="h-4 w-4" />
            Open Merchant Center
          </a>
        </div>
      </div>

      {/* Product Sync Status */}
      {syncStatus && (
        <div className="rounded-lg border p-6">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <Package className="h-5 w-5" />
            Product Synchronization Status
          </h3>
          <div className="grid md:grid-cols-6 gap-4">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Total Products</p>
              <p className="text-2xl font-bold">{syncStatus.total}</p>
            </div>
            <div className="space-y-1 bg-green-50 p-3 rounded-lg">
              <p className="text-sm text-muted-foreground">Synced</p>
              <p className="text-2xl font-bold text-green-700">{syncStatus.synced}</p>
            </div>
            <div className="space-y-1 bg-blue-50 p-3 rounded-lg">
              <p className="text-sm text-muted-foreground">Pending</p>
              <p className="text-2xl font-bold text-blue-700">{syncStatus.pending}</p>
            </div>
            <div className="space-y-1 bg-emerald-50 p-3 rounded-lg">
              <p className="text-sm text-muted-foreground">Approved</p>
              <p className="text-2xl font-bold text-emerald-700">{syncStatus.approved}</p>
            </div>
            <div className="space-y-1 bg-red-50 p-3 rounded-lg">
              <p className="text-sm text-muted-foreground">Rejected</p>
              <p className="text-2xl font-bold text-red-700">{syncStatus.rejected}</p>
            </div>
            <div className="space-y-1 bg-amber-50 p-3 rounded-lg">
              <p className="text-sm text-muted-foreground">With Issues</p>
              <p className="text-2xl font-bold text-amber-700">{syncStatus.issues}</p>
            </div>
          </div>
        </div>
      )}

      {/* Configuration Form */}
      <div className="rounded-lg border p-6 space-y-6">
        <h3 className="font-semibold">Configuration</h3>

        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium">Merchant Center ID <span className="text-red-500">*</span></label>
            <div className="relative mt-1">
              <input
                type="text"
                value={config.merchantId}
                onChange={(e) => setConfig({ ...config, merchantId: e.target.value })}
                className="w-full rounded-lg border px-3 py-2 text-sm pr-10"
                placeholder="123456789"
              />
              <button type="button" onClick={() => toggleSecret("merchantId")} className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-muted rounded">
                {showSecrets.merchantId ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <p className="text-xs text-muted-foreground mt-1">Found in Merchant Center → Settings → Business Information</p>
          </div>

          <div>
            <label className="text-sm font-medium">Data Source ID</label>
            <div className="relative mt-1">
              <input
                type="text"
                value={config.dataSourceId}
                onChange={(e) => setConfig({ ...config, dataSourceId: e.target.value })}
                className="w-full rounded-lg border px-3 py-2 text-sm pr-10"
                placeholder="Optional — for API-based product management"
              />
              <button type="button" onClick={() => toggleSecret("dataSourceId")} className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-muted rounded">
                {showSecrets.dataSourceId ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <p className="text-xs text-muted-foreground mt-1">Create a primary data source in Merchant Center → Products → Data sources</p>
          </div>
        </div>

        <div className="pt-4 border-t space-y-4">
          <h4 className="font-medium">Automation Settings</h4>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.autoSync}
                  onChange={(e) => setConfig({ ...config, autoSync: e.target.checked })}
                  className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                />
                <span className="text-sm">Enable Automatic Sync</span>
              </label>
              <p className="text-xs text-muted-foreground mt-1 ml-6">Automatically sync product changes to Merchant Center</p>
            </div>
            <div>
              <label className="text-sm font-medium">Sync Frequency</label>
              <select
                value={config.syncFrequency}
                onChange={(e) => setConfig({ ...config, syncFrequency: e.target.value as MerchantCenterConfig["syncFrequency"] })}
                className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
                disabled={!config.autoSync}
              >
                <option value="manual">Manual Only</option>
                <option value="hourly">Every Hour</option>
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
              </select>
              <p className="text-xs text-muted-foreground mt-1">How often to sync eligible product changes</p>
            </div>
          </div>
        </div>
      </div>

      {/* Product Eligibility */}
      <div className="rounded-lg border p-6 bg-blue-50 border-blue-200">
        <h3 className="font-semibold text-blue-900 mb-3 flex items-center gap-2">
          <Package className="h-5 w-5" />
          Product Sync Eligibility
        </h3>
        <p className="text-sm text-blue-800 mb-3">
          Products are automatically synced when they meet these criteria:
        </p>
        <ul className="space-y-1 text-sm text-blue-800 list-disc list-inside">
          <li>Status is <strong>published</strong></li>
          <li>Type is <strong>product</strong>, <strong>digital</strong>, or <strong>saas</strong></li>
          <li>Has a valid <strong>price {'>'} 0</strong></li>
          <li>Has at least one <strong>image</strong></li>
          <li>Has <strong>SKU</strong> or <strong>GTIN</strong> (for Merchant Center)</li>
          <li>Category is mapped to a <strong>Google Product Category</strong></li>
        </ul>
        <p className="text-xs text-blue-700 mt-3">
          Configure Google Product Categories in the Product edit page. Sync includes: title, description, price, images, availability, category, brand, GTIN, MPN, condition.
        </p>
      </div>
    </div>
  );
}