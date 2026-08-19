"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { Save, Loader2, CheckCircle2, AlertCircle, ExternalLink, RefreshCw, Eye, EyeOff, Key, Target, Zap, Shield, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

interface GoogleAdsConfig {
  customerId: string;
  developerToken: string;
  conversionIds: string[];
  remarketingTag: string;
  autoTrackConversions: boolean;
  enhancedConversions: boolean;
}

export default function GoogleAdsPage() {
  const { data: session, status } = useSession();
  const [config, setConfig] = useState<GoogleAdsConfig>({
    customerId: "",
    developerToken: "",
    conversionIds: [],
    remarketingTag: "",
    autoTrackConversions: true,
    enhancedConversions: false,
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
  const [newConversionId, setNewConversionId] = useState("");

  useEffect(() => {
    if (status === "loading") return;
    if (status === "unauthenticated") {
      window.location.href = "/login?callbackUrl=/dashboard/marketing/google/ads";
      return;
    }
    fetchConfig();
  }, [status]);

  const fetchConfig = async () => {
    try {
      const res = await fetch("/api/marketing/google/services/ads");
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
      const res = await fetch("/api/marketing/google/services/ads", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      });
      if (res.status === 401) { window.location.href = "/login?callbackUrl=/dashboard/marketing/google/ads"; return; }
      const data = await res.json();
      if (res.ok && data.success) {
        setSaveMessage({ type: "success", text: "Google Ads configuration saved successfully" });
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
      const res = await fetch("/api/marketing/google/services/ads/test", { method: "POST" });
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

  const addConversionId = () => {
    if (newConversionId.trim() && !config.conversionIds.includes(newConversionId.trim())) {
      setConfig({ ...config, conversionIds: [...config.conversionIds, newConversionId.trim()] });
      setNewConversionId("");
    }
  };

  const removeConversionId = (id: string) => {
    setConfig({ ...config, conversionIds: config.conversionIds.filter((c) => c !== id) });
  };

  const toggleSecret = (key: string) => {
    setShowSecrets((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const getStatusConfig = (status: string) => {
    const configs: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
      not_configured: { label: "Not configured", color: "bg-gray-100 text-gray-700", icon: <AlertCircle className="h-3.5 w-3.5" /> },
      config_required: { label: "Configuration required", color: "bg-amber-100 text-amber-700", icon: <Key className="h-3.5 w-3.5" /> },
      auth_required: { label: "Authorization required", color: "bg-blue-100 text-blue-700", icon: <Zap className="h-3.5 w-3.5" /> },
      connected: { label: "Connected", color: "bg-green-100 text-green-700", icon: <CheckCircle2 className="h-3.5 w-3.5" /> },
      connection_failed: { label: "Connection failed", color: "bg-red-100 text-red-700", icon: <AlertCircle className="h-3.5 w-3.5" /> },
      token_expired: { label: "Token expired", color: "bg-amber-100 text-amber-700", icon: <RefreshCw className="h-3.5 w-3.5 animate-spin" /> },
      permission_denied: { label: "Permission denied", color: "bg-red-100 text-red-700", icon: <AlertCircle className="h-3.5 w-3.5" /> },
      syncing: { label: "Testing...", color: "bg-blue-100 text-blue-700", icon: <Loader2 className="h-3.5 w-3.5 animate-spin" /> },
      sync_completed: { label: "Test passed", color: "bg-green-100 text-green-700", icon: <CheckCircle2 className="h-3.5 w-3.5" /> },
      sync_failed: { label: "Test failed", color: "bg-red-100 text-red-700", icon: <AlertTriangle className="h-3.5 w-3.5" /> },
    };
    return configs[status] || configs.not_configured;
  };

  if (status === "loading") {
    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold">Google Ads</h2>
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
            <span className="h-6 w-6 bg-primary/10 rounded-lg flex items-center justify-center text-primary font-bold text-xs">ADS</span>
            Google Ads
          </h2>
          <p className="text-sm text-muted-foreground mt-1">Configure conversion tracking, remarketing, and campaign readiness</p>
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

      {/* Readiness Notice */}
      <div className="rounded-lg border p-6 bg-amber-50 border-amber-200">
        <h3 className="font-semibold text-amber-900 mb-3 flex items-center gap-2">
          <Shield className="h-5 w-5" />
          Important: This is a Readiness & Configuration Area
        </h3>
        <p className="text-sm text-amber-800 mb-3">
          This page configures Google Ads tracking <strong>only</strong>. It does <strong>not</strong> create campaigns, spend budget, or manage ads automatically.
        </p>
        <ul className="space-y-1 text-sm text-amber-800 list-disc list-inside">
          <li>Conversion tracking setup for Wall-V events (lead, purchase, signup, etc.)</li>
          <li>Remarketing tag configuration for audience building</li>
          <li>Enhanced conversions for improved attribution</li>
          <li>Campaign readiness validation before launch</li>
        </ul>
        <p className="text-xs text-amber-700 mt-3">
          <strong>Policy:</strong> No automatic ad spending. Any future budget-spending features require explicit administrator authorization.
        </p>
      </div>

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
          {statusInfo?.details?.customerId && (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Customer ID</p>
              <p className="font-medium font-mono text-sm">{statusInfo.details.customerId}</p>
            </div>
          )}
        </div>
        {statusInfo?.lastError && (
          <div className="mt-4 p-3 rounded bg-red-50 border border-red-200">
            <p className="text-sm text-red-700"><strong>Last Error:</strong> {statusInfo.lastError}</p>
          </div>
        )}
        <div className="mt-4 flex flex-wrap gap-2">
          <button onClick={handleTest} disabled={testing} className="inline-flex items-center gap-2 text-sm border rounded-lg px-3 py-2 hover:bg-accent transition-colors disabled:opacity-50">
            {testing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            Test Connection
          </button>
          <a href="https://ads.google.com/" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-sm border rounded-lg px-3 py-2 hover:bg-accent transition-colors">
            <ExternalLink className="h-4 w-4" />
            Open Google Ads
          </a>
        </div>
      </div>

      {/* Configuration Form */}
      <div className="rounded-lg border p-6 space-y-6">
        <h3 className="font-semibold">Configuration</h3>

        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium">Customer ID <span className="text-red-500">*</span></label>
            <div className="relative mt-1">
              <input
                type="text"
                value={config.customerId}
                onChange={(e) => setConfig({ ...config, customerId: e.target.value })}
                className="w-full rounded-lg border px-3 py-2 text-sm pr-10"
                placeholder="123-456-7890"
              />
              <button type="button" onClick={() => toggleSecret("customerId")} className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-muted rounded">
                {showSecrets.customerId ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <p className="text-xs text-muted-foreground mt-1">Format: 123-456-7890 (found in Google Ads top-right corner)</p>
          </div>

          <div>
            <label className="text-sm font-medium">Developer Token</label>
            <div className="relative mt-1">
              <input
                type={showSecrets.developerToken ? "text" : "password"}
                value={config.developerToken}
                onChange={(e) => setConfig({ ...config, developerToken: e.target.value })}
                className="w-full rounded-lg border px-3 py-2 text-sm pr-10"
                placeholder="Optional — for API access"
              />
              <button type="button" onClick={() => toggleSecret("developerToken")} className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-muted rounded">
                {showSecrets.developerToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <p className="text-xs text-muted-foreground mt-1">Required for Google Ads API. Apply at: Ads Manager → Tools → API Center</p>
          </div>

          <div>
            <label className="text-sm font-medium">Conversion IDs</label>
            <div className="mt-1 space-y-2">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newConversionId}
                  onChange={(e) => setNewConversionId(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addConversionId()}
                  className="flex-1 rounded-lg border px-3 py-2 text-sm"
                  placeholder="AW-123456789/ABCDefGhIjK"
                />
                <button
                  type="button"
                  onClick={addConversionId}
                  disabled={!newConversionId.trim()}
                  className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50"
                >
                  <Target className="h-4 w-4" /> Add
                </button>
              </div>
              {config.conversionIds.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {config.conversionIds.map((id) => (
                    <span key={id} className="inline-flex items-center gap-1.5 px-3 py-1 bg-primary/10 text-primary rounded-full text-sm">
                      <span className="font-mono">{id}</span>
                      <button type="button" onClick={() => removeConversionId(id)} className="hover:text-red-500">
                        <AlertCircle className="h-3.5 w-3.5" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
              <p className="text-xs text-muted-foreground">Add conversion action IDs from Google Ads → Tools → Conversions → Action → Tag setup</p>
            </div>
          </div>

          <div>
            <label className="text-sm font-medium">Remarketing Tag (gtag config)</label>
            <div className="relative mt-1">
              <input
                type={showSecrets.remarketingTag ? "text" : "password"}
                value={config.remarketingTag}
                onChange={(e) => setConfig({ ...config, remarketingTag: e.target.value })}
                className="w-full rounded-lg border px-3 py-2 text-sm pr-10"
                placeholder="AW-123456789"
              />
              <button type="button" onClick={() => toggleSecret("remarketingTag")} className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-muted rounded">
                {showSecrets.remarketingTag ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <p className="text-xs text-muted-foreground mt-1">Global site tag ID for remarketing (usually same as Customer ID)</p>
          </div>
        </div>

        <div className="pt-4 border-t space-y-4">
          <h4 className="font-medium">Tracking Options</h4>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.autoTrackConversions}
                  onChange={(e) => setConfig({ ...config, autoTrackConversions: e.target.checked })}
                  className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                />
                <span className="text-sm">Auto-track Wall-V Conversions</span>
              </label>
              <p className="text-xs text-muted-foreground mt-1 ml-6">Automatically send configured events as conversions to Google Ads</p>
            </div>
            <div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.enhancedConversions}
                  onChange={(e) => setConfig({ ...config, enhancedConversions: e.target.checked })}
                  className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                />
                <span className="text-sm">Enhanced Conversions</span>
              </label>
              <p className="text-xs text-muted-foreground mt-1 ml-6">Send hashed customer data for improved attribution (requires privacy compliance)</p>
            </div>
          </div>
        </div>
      </div>

      {/* Conversion Mapping Guide */}
      <div className="rounded-lg border p-6 bg-blue-50 border-blue-200">
        <h3 className="font-semibold text-blue-900 mb-3 flex items-center gap-2">
          <Target className="h-5 w-5" />
          Recommended Wall-V → Google Ads Conversion Mapping
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-blue-800">
            <thead>
              <tr className="border-b border-blue-200">
                <th className="text-left p-2 font-medium">Wall-V Event</th>
                <th className="text-left p-2 font-medium">Google Ads Conversion Type</th>
                <th className="text-left p-2 font-medium">Category</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-blue-100"><td className="p-2 font-mono">generate_lead</td><td className="p-2">Lead</td><td className="p-2">Contact</td></tr>
              <tr className="border-b border-blue-100"><td className="p-2 font-mono">contact_form_submit</td><td className="p-2">Lead</td><td className="p-2">Submit Lead Form</td></tr>
              <tr className="border-b border-blue-100"><td className="p-2 font-mono">demo_requested</td><td className="p-2">Lead</td><td className="p-2">Request Quote</td></tr>
              <tr className="border-b border-blue-100"><td className="p-2 font-mono">sign_up</td><td className="p-2">Sign-up</td><td className="p-2">Account Creation</td></tr>
              <tr className="border-b border-blue-100"><td className="p-2 font-mono">begin_checkout</td><td className="p-2">Begin Checkout</td><td className="p-2">Checkout</td></tr>
              <tr className="border-b border-blue-100"><td className="p-2 font-mono">purchase</td><td className="p-2">Purchase</td><td className="p-2">Sale</td></tr>
              <tr className="border-b border-blue-100"><td className="p-2 font-mono">project_created</td><td className="p-2">Lead</td><td className="p-2">Qualified Lead</td></tr>
            </tbody>
          </table>
        </div>
        <p className="text-xs text-blue-700 mt-3">
          Configure these in Google Ads → Tools → Conversions → New Conversion Action → Import → Google Analytics 4 / Web
        </p>
      </div>
    </div>
  );
}